'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Truck, Shield, ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Shipping Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    district: '',
    postalCode: '',
    
    // Billing Information
    billingSameAsShipping: true,
    billingFirstName: '',
    billingLastName: '',
    billingAddress: '',
    billingCity: '',
    billingDistrict: '',
    billingPostalCode: '',
    
    // Payment Information
    paymentMethod: 'credit_card',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: '',
    
    // Order Summary
    order: {
      items: [
        {
          id: '1',
          productName: 'MacBook Pro 14"',
          quantity: 1,
          price: 32999,
          totalPrice: 32999
        },
        {
          id: '2',
          productName: 'iPhone 15 Pro',
          quantity: 2,
          price: 45999,
          totalPrice: 91998
        }
      ],
      subtotal: 124997,
      shippingCost: 0,
      taxAmount: 22499.46,
      totalAmount: 147496.46
    }
  });

  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setLoading(false);
    setStep(4); // Success step
  };

  const steps = [
    { id: 1, name: 'Teslimat Bilgileri', description: 'Teslimat adresinizi girin' },
    { id: 2, name: 'Ödeme Bilgileri', description: 'Ödeme yönteminizi seçin' },
    { id: 3, name: 'Sipariş Onayı', description: 'Siparişinizi kontrol edin' },
    { id: 4, name: 'Tamamlandı', description: 'Siparişiniz alındı' }
  ];

  return (
    <div className="min-h-screen bg-ios-gray-50">
      {/* Header */}
      <header className="bg-white shadow-ios border-b border-ios-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-ios bg-gradient-to-br from-ios-blue to-ios-purple flex items-center justify-center">
                <span className="text-white font-bold text-lg">AT</span>
              </div>
              <span className="ml-2 text-xl font-bold text-ios-gray-900">AyazTrade</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-ios-gray-600 mb-8">
          <Link href="/" className="hover:text-ios-blue">Ana Sayfa</Link>
          <span>/</span>
          <Link href="/cart" className="hover:text-ios-blue">Sepet</Link>
          <span>/</span>
          <span className="text-ios-gray-900">Ödeme</span>
        </nav>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((stepItem, index) => (
              <div key={stepItem.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  step >= stepItem.id 
                    ? 'bg-ios-blue border-ios-blue text-white' 
                    : 'bg-white border-ios-gray-300 text-ios-gray-500'
                }`}>
                  {step > stepItem.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{stepItem.id}</span>
                  )}
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${
                    step >= stepItem.id ? 'text-ios-blue' : 'text-ios-gray-500'
                  }`}>
                    {stepItem.name}
                  </p>
                  <p className="text-xs text-ios-gray-500">{stepItem.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`hidden sm:block w-24 h-0.5 mx-4 ${
                    step > stepItem.id ? 'bg-ios-blue' : 'bg-ios-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Step 1: Shipping Information */}
              {step === 1 && (
                <div className="bg-white rounded-ios-lg shadow-ios p-6">
                  <h2 className="text-xl font-bold text-ios-gray-900 mb-6">Teslimat Bilgileri</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">Ad *</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 rounded-ios border border-ios-gray-300 focus:outline-none focus:ring-2 focus:ring-ios-blue focus:border-transparent"
                        placeholder="Adınız"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">Soyad *</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 rounded-ios border border-ios-gray-300 focus:outline-none focus:ring-2 focus:ring-ios-blue focus:border-transparent"
                        placeholder="Soyadınız"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">E-posta *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 rounded-ios border border-ios-gray-300 focus:outline-none focus:ring-2 focus:ring-ios-blue focus:border-transparent"
                        placeholder="ornek@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">Telefon *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 rounded-ios border border-ios-gray-300 focus:outline-none focus:ring-2 focus:ring-ios-blue focus:border-transparent"
                        placeholder="+90 555 123 4567"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-ios-gray-700 mb-2">Adres *</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      rows={3}
                      className="w-full px-4 py-3 rounded-ios border border-ios-gray-300 focus:outline-none focus:ring-2 focus:ring-ios-blue focus:border-transparent"
                      placeholder="Tam adresinizi girin"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">Şehir *</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 rounded-ios border border-ios-gray-300 focus:outline-none focus:ring-2 focus:ring-ios-blue focus:border-transparent"
                        placeholder="İstanbul"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">İlçe *</label>
                      <input
                        type="text"
                        name="district"
                        value={formData.district}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 rounded-ios border border-ios-gray-300 focus:outline-none focus:ring-2 focus:ring-ios-blue focus:border-transparent"
                        placeholder="Kadıköy"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">Posta Kodu *</label>
                      <input
                        type="text"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 rounded-ios border border-ios-gray-300 focus:outline-none focus:ring-2 focus:ring-ios-blue focus:border-transparent"
                        placeholder="34710"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Payment Information */}
              {step === 2 && (
                <div className="bg-white rounded-ios-lg shadow-ios p-6">
                  <h2 className="text-xl font-bold text-ios-gray-900 mb-6">Ödeme Bilgileri</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">Ödeme Yöntemi</label>
                      <div className="space-y-2">
                        <label className="flex items-center p-4 border border-ios-gray-300 rounded-ios cursor-pointer hover:bg-ios-gray-50">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="credit_card"
                            checked={formData.paymentMethod === 'credit_card'}
                            onChange={handleInputChange}
                            className="mr-3"
                          />
                          <CreditCard className="w-5 h-5 mr-2" />
                          <span>Kredi Kartı</span>
                        </label>
                        <label className="flex items-center p-4 border border-ios-gray-300 rounded-ios cursor-pointer hover:bg-ios-gray-50">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="bank_transfer"
                            checked={formData.paymentMethod === 'bank_transfer'}
                            onChange={handleInputChange}
                            className="mr-3"
                          />
                          <span>Banka Havalesi</span>
                        </label>
                      </div>
                    </div>

                    {formData.paymentMethod === 'credit_card' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-ios-gray-700 mb-2">Kart Numarası *</label>
                          <input
                            type="text"
                            name="cardNumber"
                            value={formData.cardNumber}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 rounded-ios border border-ios-gray-300 focus:outline-none focus:ring-2 focus:ring-ios-blue focus:border-transparent"
                            placeholder="1234 5678 9012 3456"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-ios-gray-700 mb-2">Son Kullanma Tarihi *</label>
                            <input
                              type="text"
                              name="expiryDate"
                              value={formData.expiryDate}
                              onChange={handleInputChange}
                              required
                              className="w-full px-4 py-3 rounded-ios border border-ios-gray-300 focus:outline-none focus:ring-2 focus:ring-ios-blue focus:border-transparent"
                              placeholder="MM/YY"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-ios-gray-700 mb-2">CVV *</label>
                            <input
                              type="text"
                              name="cvv"
                              value={formData.cvv}
                              onChange={handleInputChange}
                              required
                              className="w-full px-4 py-3 rounded-ios border border-ios-gray-300 focus:outline-none focus:ring-2 focus:ring-ios-blue focus:border-transparent"
                              placeholder="123"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-ios-gray-700 mb-2">Kart Üzerindeki İsim *</label>
                          <input
                            type="text"
                            name="cardName"
                            value={formData.cardName}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 rounded-ios border border-ios-gray-300 focus:outline-none focus:ring-2 focus:ring-ios-blue focus:border-transparent"
                            placeholder="AHMET YILMAZ"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Order Confirmation */}
              {step === 3 && (
                <div className="bg-white rounded-ios-lg shadow-ios p-6">
                  <h2 className="text-xl font-bold text-ios-gray-900 mb-6">Sipariş Onayı</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-ios-gray-900 mb-3">Teslimat Bilgileri</h3>
                      <div className="bg-ios-gray-50 rounded-ios p-4">
                        <p className="font-medium">{formData.firstName} {formData.lastName}</p>
                        <p>{formData.address}</p>
                        <p>{formData.district}, {formData.city} {formData.postalCode}</p>
                        <p>{formData.phone}</p>
                        <p>{formData.email}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-ios-gray-900 mb-3">Ödeme Bilgileri</h3>
                      <div className="bg-ios-gray-50 rounded-ios p-4">
                        <p className="font-medium">
                          {formData.paymentMethod === 'credit_card' ? 'Kredi Kartı' : 'Banka Havalesi'}
                        </p>
                        {formData.paymentMethod === 'credit_card' && (
                          <p>**** **** **** {formData.cardNumber.slice(-4)}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-ios-gray-900 mb-3">Sipariş Detayları</h3>
                      <div className="space-y-2">
                        {formData.order.items.map((item) => (
                          <div key={item.id} className="flex justify-between items-center py-2 border-b border-ios-gray-200">
                            <span>{item.productName} x {item.quantity}</span>
                            <span className="font-medium">₺{item.totalPrice.toLocaleString('tr-TR')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Success */}
              {step === 4 && (
                <div className="bg-white rounded-ios-lg shadow-ios p-6 text-center">
                  <div className="w-16 h-16 bg-ios-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-ios-green" />
                  </div>
                  <h2 className="text-2xl font-bold text-ios-gray-900 mb-2">Siparişiniz Alındı!</h2>
                  <p className="text-ios-gray-600 mb-6">
                    Sipariş numaranız: <span className="font-bold text-ios-blue">#ORD-2024-001</span>
                  </p>
                  <p className="text-ios-gray-600 mb-8">
                    Siparişiniz onaylandı ve kargoya verilecek. Takip bilgileri e-posta adresinize gönderilecektir.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      href="/"
                      className="bg-ios-blue text-white px-6 py-3 rounded-ios font-semibold hover:bg-blue-600 transition-colors"
                    >
                      Ana Sayfaya Dön
                    </Link>
                    <Link
                      href="/account"
                      className="border border-ios-gray-300 text-ios-gray-700 px-6 py-3 rounded-ios font-semibold hover:bg-ios-gray-50 transition-colors"
                    >
                      Siparişlerim
                    </Link>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              {step < 4 && (
                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={step === 1}
                    className="flex items-center space-x-2 px-6 py-3 border border-ios-gray-300 text-ios-gray-700 rounded-ios font-semibold hover:bg-ios-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Geri</span>
                  </button>

                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="bg-ios-blue text-white px-6 py-3 rounded-ios font-semibold hover:bg-blue-600 transition-colors"
                    >
                      Devam Et
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-ios-green text-white px-6 py-3 rounded-ios font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>İşleniyor...</span>
                        </>
                      ) : (
                        <>
                          <Shield className="w-5 h-5" />
                          <span>Siparişi Tamamla</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Order Summary Sidebar */}
          {step < 4 && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-ios-lg shadow-ios p-6 sticky top-8">
                <h2 className="text-lg font-bold text-ios-gray-900 mb-4">Sipariş Özeti</h2>
                
                <div className="space-y-3 mb-6">
                  {formData.order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-ios-gray-100">
                      <div>
                        <p className="text-sm font-medium text-ios-gray-900">{item.productName}</p>
                        <p className="text-xs text-ios-gray-600">Adet: {item.quantity}</p>
                      </div>
                      <span className="font-medium">₺{item.totalPrice.toLocaleString('tr-TR')}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between">
                    <span className="text-ios-gray-600">Ara Toplam</span>
                    <span className="font-medium">₺{formData.order.subtotal.toLocaleString('tr-TR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ios-gray-600">Kargo</span>
                    <span className="font-medium text-ios-green">Ücretsiz</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ios-gray-600">KDV</span>
                    <span className="font-medium">₺{formData.order.taxAmount.toLocaleString('tr-TR')}</span>
                  </div>
                </div>

                <div className="border-t border-ios-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-ios-gray-900">Toplam</span>
                    <span className="text-2xl font-bold text-ios-blue">₺{formData.order.totalAmount.toLocaleString('tr-TR')}</span>
                  </div>
                </div>

                <div className="mt-6 text-xs text-ios-gray-500">
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="w-4 h-4 text-ios-green" />
                    <span>Güvenli ödeme garantisi</span>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Truck className="w-4 h-4 text-ios-blue" />
                    <span>Ücretsiz kargo</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-ios-orange" />
                    <span>14 gün iade garantisi</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}