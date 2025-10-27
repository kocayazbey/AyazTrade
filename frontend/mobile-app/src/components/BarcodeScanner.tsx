import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Vibration,
  Dimensions,
  Animated,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AyuCard, AyuButton, AyuBadge } from './index';
import BarcodeService, { BarcodeResult, ProductSearchResult } from '../services/barcode.service';

const { width, height } = Dimensions.get('window');

interface BarcodeScannerProps {
  onBarcodeScanned?: (result: BarcodeResult) => void;
  onProductFound?: (result: ProductSearchResult) => void;
  onClose?: () => void;
  scanType?: 'barcode' | 'qr' | 'both';
  showProductPreview?: boolean;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onBarcodeScanned,
  onProductFound,
  onClose,
  scanType = 'both',
  showProductPreview = true,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<BarcodeResult | null>(null);
  const [productResult, setProductResult] = useState<ProductSearchResult | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [scanMode, setScanMode] = useState<'barcode' | 'qr'>(scanType === 'both' ? 'barcode' : scanType);
  const [pulseAnim] = useState(new Animated.Value(1));

  const barcodeService = BarcodeService.getInstance();

  useEffect(() => {
    startPulseAnimation();
    return () => {
      stopPulseAnimation();
    };
  }, []);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
  };

  const handleScan = async () => {
    try {
      setIsLoading(true);
      setScanResult(null);
      setProductResult(null);

      let result: BarcodeResult | null = null;

      if (scanMode === 'barcode') {
        result = await barcodeService.scanBarcode();
      } else {
        result = await barcodeService.scanQRCode();
      }

      if (result) {
        setScanResult(result);
        Vibration.vibrate(100);
        await barcodeService.playScanSound();

        // Search for product if result is available
        if (showProductPreview) {
          const productSearch = scanMode === 'barcode'
            ? await barcodeService.searchProductByBarcode(result.data)
            : await barcodeService.searchProductByQRCode(result.data);

          setProductResult(productSearch);

          if (productSearch.success && productSearch.product) {
            Vibration.vibrate([0, 100, 100, 100]);
          }
        }

        onBarcodeScanned?.(result);

        if (showProductPreview && productResult?.success) {
          onProductFound?.(productResult);
        }
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      Alert.alert('Hata', error.message || 'Tarama başarısız.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTorchToggle = async () => {
    try {
      const success = await barcodeService.toggleTorch();
      if (success) {
        setTorchOn(!torchOn);
      }
    } catch (error) {
      console.error('Failed to toggle torch:', error);
    }
  };

  const handleFlashToggle = async () => {
    try {
      const success = await barcodeService.toggleFlash();
      if (success) {
        setFlashOn(!flashOn);
      }
    } catch (error) {
      console.error('Failed to toggle flash:', error);
    }
  };

  const handleManualEntry = () => {
    Alert.prompt(
      scanMode === 'barcode' ? 'Barkod Girin' : 'QR Kod Girin',
      scanMode === 'barcode' ? 'Barkodu manuel olarak girin:' : 'QR kod içeriğini girin:',
      async (text) => {
        if (text && text.trim()) {
          const result: BarcodeResult = {
            type: scanMode === 'barcode' ? 'BARCODE' : 'QR_CODE',
            data: text.trim(),
            format: scanMode === 'barcode' ? 'MANUAL' : 'QR_CODE',
          };

          setScanResult(result);

          if (showProductPreview) {
            const productSearch = scanMode === 'barcode'
              ? await barcodeService.searchProductByBarcode(text.trim())
              : await barcodeService.searchProductByQRCode(text.trim());

            setProductResult(productSearch);
            onProductFound?.(productSearch);
          }

          onBarcodeScanned?.(result);
        }
      }
    );
  };

  const renderScannerOverlay = () => (
    <View style={styles.overlay}>
      {/* Scanning Frame */}
      <View style={styles.scanningFrame}>
        <Animated.View
          style={[
            styles.scanLine,
            {
              transform: [{
                translateY: pulseAnim.interpolate({
                  inputRange: [1, 1.2],
                  outputRange: [-20, 20],
                }),
              }],
            },
          ]}
        />
      </View>

      {/* Corner indicators */}
      <View style={styles.cornerTopLeft} />
      <View style={styles.cornerTopRight} />
      <View style={styles.cornerBottomLeft} />
      <View style={styles.cornerBottomRight} />

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          {scanMode === 'barcode' ? 'Barkodu tarayın' : 'QR kodu tarayın'}
        </Text>
        <Text style={styles.instructionSubtext}>
          {scanMode === 'barcode'
            ? 'Ürün barkodunu kare içine alın'
            : 'QR kodu kare içine alın'
          }
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleTorchToggle}
        >
          <Icon
            name={torchOn ? 'flashlight-on' : 'flashlight-off'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleFlashToggle}
        >
          <Icon
            name={flashOn ? 'flash-on' : 'flash-off'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setScanMode(scanMode === 'barcode' ? 'qr' : 'barcode')}
        >
          <Icon name="qr-code" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderResult = () => {
    if (!scanResult) return null;

    return (
      <View style={styles.resultContainer}>
        <AyuCard style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>
              {scanMode === 'barcode' ? 'Barkod' : 'QR Kod'} Tanımlandı
            </Text>
            <TouchableOpacity onPress={() => setScanResult(null)}>
              <Icon name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.resultContent}>
            <View style={styles.resultInfo}>
              <Text style={styles.resultLabel}>Tür:</Text>
              <Text style={styles.resultValue}>
                {barcodeService.parseBarcodeFormat(scanResult.format || 'UNKNOWN')}
              </Text>
            </View>

            <View style={styles.resultInfo}>
              <Text style={styles.resultLabel}>Veri:</Text>
              <Text style={styles.resultValue} numberOfLines={3}>
                {scanResult.data}
              </Text>
            </View>

            {scanResult.rawBytes && (
              <View style={styles.resultInfo}>
                <Text style={styles.resultLabel}>Boyut:</Text>
                <Text style={styles.resultValue}>
                  {scanResult.rawBytes.length} bytes
                </Text>
              </View>
            )}
          </View>

          {productResult && (
            <View style={styles.productResult}>
              {productResult.success ? (
                <View style={styles.productSuccess}>
                  <Icon name="check-circle" size={20} color="#10b981" />
                  <Text style={styles.productSuccessText}>Ürün Bulundu!</Text>
                </View>
              ) : (
                <View style={styles.productError}>
                  <Icon name="error" size={20} color="#ef4444" />
                  <Text style={styles.productErrorText}>
                    {productResult.message}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.resultActions}>
            <AyuButton
              variant="outline"
              onPress={() => setScanResult(null)}
              style={styles.resultButton}
            >
              Tekrar Tara
            </AyuButton>

            <AyuButton
              variant="primary"
              onPress={handleManualEntry}
              style={styles.resultButton}
            >
              Manuel Gir
            </AyuButton>
          </View>
        </AyuCard>
      </View>
    );
  };

  const renderProductPreview = () => {
    if (!productResult?.success || !productResult.product) return null;

    const product = productResult.product;

    return (
      <View style={styles.productPreview}>
        <AyuCard style={styles.productCard}>
          <View style={styles.productHeader}>
            <Text style={styles.productTitle}>Ürün Bilgileri</Text>
            <AyuBadge variant={product.inStock ? 'success' : 'error'}>
              {product.inStock ? 'Stokta Var' : 'Stokta Yok'}
            </AyuBadge>
          </View>

          <View style={styles.productContent}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productSku}>SKU: {product.sku}</Text>
            <Text style={styles.productPrice}>₺{product.price.toLocaleString()}</Text>
          </View>

          <View style={styles.productActions}>
            <AyuButton
              variant="outline"
              size="sm"
              onPress={() => {
                // Navigate to product detail
                onClose?.();
              }}
              style={styles.productButton}
            >
              Ürün Detayı
            </AyuButton>

            <AyuButton
              variant="primary"
              size="sm"
              onPress={() => {
                // Add to cart
                onClose?.();
              }}
              style={styles.productButton}
              disabled={!product.inStock}
            >
              Sepete Ekle
            </AyuButton>
          </View>
        </AyuCard>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {scanMode === 'barcode' ? 'Barkod Tarayıcı' : 'QR Kod Tarayıcı'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Camera Area */}
      <View style={styles.cameraArea}>
        {renderScannerOverlay()}

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1e3a8a" />
            <Text style={styles.loadingText}>Taranıyor...</Text>
          </View>
        )}
      </View>

      {/* Scan Button */}
      <View style={styles.scanButtonContainer}>
        <AyuButton
          variant="primary"
          onPress={handleScan}
          disabled={isLoading}
          style={styles.scanButton}
        >
          {isLoading ? 'Taranıyor...' : 'Tara'}
        </AyuButton>

        <TouchableOpacity
          style={styles.manualButton}
          onPress={handleManualEntry}
        >
          <Icon name="keyboard" size={20} color="#64748b" />
          <Text style={styles.manualButtonText}>Manuel Gir</Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      {renderResult()}
      {renderProductPreview()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  cameraArea: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#1e3a8a',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#1e3a8a',
    opacity: 0.8,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: height / 2 - 125,
    left: width / 2 - 125,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#1e3a8a',
  },
  cornerTopRight: {
    position: 'absolute',
    top: height / 2 - 125,
    right: width / 2 - 125,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#1e3a8a',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: height / 2 - 125,
    left: width / 2 - 125,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#1e3a8a',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: height / 2 - 125,
    right: width / 2 - 125,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#1e3a8a',
  },
  instructions: {
    position: 'absolute',
    bottom: 150,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  instructionSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    gap: 20,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  scanButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: 'rgba(0,0,0,0.9)',
    gap: 12,
  },
  scanButton: {
    paddingVertical: 16,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  manualButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  resultContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  resultContent: {
    padding: 16,
  },
  resultInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 14,
    color: '#64748b',
    width: 60,
  },
  resultValue: {
    fontSize: 14,
    color: '#0f172a',
    flex: 1,
    fontFamily: 'monospace',
  },
  productResult: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  productSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
  },
  productSuccessText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  productError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
  },
  productErrorText: {
    color: '#991b1b',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  resultButton: {
    flex: 1,
  },
  productPreview: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  productTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  productContent: {
    padding: 16,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  productSku: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  productActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  productButton: {
    flex: 1,
  },
});

export default BarcodeScanner;
