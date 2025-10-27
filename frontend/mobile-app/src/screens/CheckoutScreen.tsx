import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { AyuCard, AyuButton, AyuInput, AyuBadge } from '../components';

const { width } = Dimensions.get('window');

interface ShippingAddress {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'bank_transfer' | 'cash_on_delivery';
  name: string;
  icon: string;
  description: string;
}

interface OrderSummary {
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  itemCount: number;
}

const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Türkiye',
    phone: '',
  });
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [orderSummary, setOrderSummary] = useState<OrderSummary>({
    subtotal: 0,
    tax: 0,
    shipping: 0,
    discount: 0,
    total: 0,
    itemCount: 0,
  });

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'credit_card',
      type: 'credit_card',
      name: 'Kredi Kartı',
      icon: 'credit-card',
      description: 'Visa, Mastercard, American Express',
    },
    {
      id: 'bank_transfer',
      type: 'bank_transfer',
      name: 'Banka Havalesi',
      icon: 'account-balance',
      description: 'EFT/Havale ile ödeme',
    },
    {
      id: 'cash_on_delivery',
      type: 'cash_on_delivery',
      name: 'Kapıda Ödeme',
      icon: 'local-shipping',
      description: 'Teslimatta nakit ödeme',
    },
  ];

  useEffect(() => {
    fetchOrderSummary();
  }, []);

  const fetchOrderSummary = async () => {
    try {
      const response = await fetch('/api/v1/cart/summary');
      const data = await response.json();
      
      if (data.success) {
        setOrderSummary(data.data);
      }
    } catch (error) {
      console.error('Error fetching order summary:', error);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!shippingAddress.firstName || !shippingAddress.lastName || 
          !shippingAddress.address || !shippingAddress.city || 
          !shippingAddress.phone) {
        Alert.alert('Uyarı', 'Lütfen tüm gerekli alanları doldurun.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!selectedPayment) {
        Alert.alert('Uyarı', 'Lütfen bir ödeme yöntemi seçin.');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePlaceOrder = async () => {
    try {
      setLoading(true);
      
      const orderData = {
        shippingAddress,
        paymentMethod: selectedPayment,
        items: [], // Will be fetched from cart
      };

      const response = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Sipariş Başarılı',
          'Siparişiniz başarıyla oluşturuldu. Sipariş numaranız: ' + data.data.orderNumber,
          [
            {
              text: 'Tamam',
              onPress: () => navigation.navigate('Orders'),
            },
          ]
        );
      } else {
        Alert.alert('Hata', data.message || 'Sipariş oluşturulamadı.');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Hata', 'Sipariş oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View
            style={[
              styles.stepCircle,
              currentStep >= step && styles.stepCircleActive,
            ]}
          >
            <Text
              style={[
                styles.stepText,
                currentStep >= step && styles.stepTextActive,
              ]}
            >
              {step}
            </Text>
          </View>
          {step < 3 && (
            <View
              style={[
                styles.stepLine,
                currentStep > step && styles.stepLineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderShippingForm = () => (
    <AyuCard>
      <Text style={styles.sectionTitle}>Teslimat Adresi</Text>
      
      <View style={styles.formRow}>
        <AyuInput
          label="Ad"
          value={shippingAddress.firstName}
          onChangeText={(text) => setShippingAddress({ ...shippingAddress, firstName: text })}
          style={styles.halfInput}
          required
        />
        <AyuInput
          label="Soyad"
          value={shippingAddress.lastName}
          onChangeText={(text) => setShippingAddress({ ...shippingAddress, lastName: text })}
          style={styles.halfInput}
          required
        />
      </View>
      
      <AyuInput
        label="Adres"
        value={shippingAddress.address}
        onChangeText={(text) => setShippingAddress({ ...shippingAddress, address: text })}
        required
      />
      
      <View style={styles.formRow}>
        <AyuInput
          label="Şehir"
          value={shippingAddress.city}
          onChangeText={(text) => setShippingAddress({ ...shippingAddress, city: text })}
          style={styles.halfInput}
          required
        />
        <AyuInput
          label="İlçe"
          value={shippingAddress.state}
          onChangeText={(text) => setShippingAddress({ ...shippingAddress, state: text })}
          style={styles.halfInput}
        />
      </View>
      
      <View style={styles.formRow}>
        <AyuInput
          label="Posta Kodu"
          value={shippingAddress.zipCode}
          onChangeText={(text) => setShippingAddress({ ...shippingAddress, zipCode: text })}
          style={styles.halfInput}
        />
        <AyuInput
          label="Telefon"
          value={shippingAddress.phone}
          onChangeText={(text) => setShippingAddress({ ...shippingAddress, phone: text })}
          style={styles.halfInput}
          keyboardType="phone-pad"
          required
        />
      </View>
    </AyuCard>
  );

  const renderPaymentMethods = () => (
    <AyuCard>
      <Text style={styles.sectionTitle}>Ödeme Yöntemi</Text>
      
      {paymentMethods.map((method) => (
        <TouchableOpacity
          key={method.id}
          style={[
            styles.paymentMethod,
            selectedPayment === method.id && styles.paymentMethodSelected,
          ]}
          onPress={() => setSelectedPayment(method.id)}
        >
          <View style={styles.paymentMethodContent}>
            <Icon
              name={method.icon}
              size={24}
              color={selectedPayment === method.id ? '#1e3a8a' : '#64748b'}
            />
            <View style={styles.paymentMethodInfo}>
              <Text
                style={[
                  styles.paymentMethodName,
                  selectedPayment === method.id && styles.paymentMethodNameSelected,
                ]}
              >
                {method.name}
              </Text>
              <Text style={styles.paymentMethodDescription}>
                {method.description}
              </Text>
            </View>
            <View
              style={[
                styles.radioButton,
                selectedPayment === method.id && styles.radioButtonSelected,
              ]}
            >
              {selectedPayment === method.id && (
                <View style={styles.radioButtonInner} />
              )}
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </AyuCard>
  );

  const renderOrderSummary = () => (
    <AyuCard>
      <Text style={styles.sectionTitle}>Sipariş Özeti</Text>
      
      <View style={styles.summaryContent}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Ara Toplam</Text>
          <Text style={styles.summaryValue}>₺{orderSummary.subtotal.toLocaleString()}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>KDV</Text>
          <Text style={styles.summaryValue}>₺{orderSummary.tax.toLocaleString()}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Kargo</Text>
          <Text style={styles.summaryValue}>
            {orderSummary.shipping > 0 ? `₺${orderSummary.shipping.toLocaleString()}` : 'Ücretsiz'}
          </Text>
        </View>
        
        {orderSummary.discount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>İndirim</Text>
            <Text style={[styles.summaryValue, styles.discountText]}>
              -₺{orderSummary.discount.toLocaleString()}
            </Text>
          </View>
        )}
        
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Toplam</Text>
          <Text style={styles.totalValue}>₺{orderSummary.total.toLocaleString()}</Text>
        </View>
      </View>
      
      <AyuButton
        variant="primary"
        onPress={handlePlaceOrder}
        loading={loading}
        style={styles.placeOrderButton}
      >
        Siparişi Tamamla
      </AyuButton>
    </AyuCard>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderShippingForm();
      case 2:
        return renderPaymentMethods();
      case 3:
        return renderOrderSummary();
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Teslimat Bilgileri';
      case 2:
        return 'Ödeme Yöntemi';
      case 3:
        return 'Sipariş Onayı';
      default:
        return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getStepTitle()}</Text>
        <View style={{ width: 24 }} />
      </View>

      {renderStepIndicator()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStepContent()}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep > 1 && (
          <AyuButton
            variant="outline"
            onPress={handlePreviousStep}
            style={styles.footerButton}
          >
            Geri
          </AyuButton>
        )}
        
        {currentStep < 3 && (
          <AyuButton
            variant="primary"
            onPress={handleNextStep}
            style={styles.footerButton}
          >
            İleri
          </AyuButton>
        )}
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#1e3a8a',
  },
  stepText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748b',
  },
  stepTextActive: {
    color: '#fff',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#1e3a8a',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  paymentMethod: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
  },
  paymentMethodSelected: {
    borderColor: '#1e3a8a',
    backgroundColor: 'rgba(30, 58, 138, 0.05)',
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  paymentMethodNameSelected: {
    color: '#1e3a8a',
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#1e3a8a',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1e3a8a',
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
  placeOrderButton: {
    paddingVertical: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 16,
  },
});

export default CheckoutScreen;