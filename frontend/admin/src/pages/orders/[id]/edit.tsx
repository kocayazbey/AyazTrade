import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AyuCard, AyuButton, AyuInput, AyuBadge } from '@/components';
import { ArrowLeft, Save, X, Package, User, CreditCard, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  items: OrderItem[];
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  shippingAddress: {
    name: string;
    street1: string;
    city: string;
    postalCode: string;
    country: string;
  };
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const OrderEditPage: React.FC = () => {
  const router = useRouter();
  const orderId = router.query.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/proxy/orders/${orderId}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOrder(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Sipariş yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!order) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/proxy/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: order.status,
          paymentStatus: order.paymentStatus,
          notes: order.notes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Sipariş güncellendi');
          router.push('/orders');
        } else {
          throw new Error(data.message || 'Sipariş güncellenemedi');
        }
      } else {
        throw new Error('Sipariş güncellenemedi');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Sipariş güncellenirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (status: string) => {
    if (order) {
      setOrder({ ...order, status });
    }
  };

  const handlePaymentStatusChange = (paymentStatus: string) => {
    if (order) {
      setOrder({ ...order, paymentStatus });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sipariş Bulunamadı</h1>
          <AyuButton onClick={() => router.push('/orders')}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            Siparişlere Dön
          </AyuButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AyuButton
              variant="outline"
              onClick={() => router.push('/orders')}
              className="mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Geri
            </AyuButton>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sipariş Düzenle</h1>
              <p className="text-gray-600">#{order.orderNumber}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <AyuButton variant="outline" onClick={() => router.push('/orders')}>
              <X className="w-5 h-5 mr-2" />
              İptal
            </AyuButton>
            <AyuButton
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </AyuButton>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <AyuCard>
            <div className="p-6">
              <div className="flex items-center mb-4">
                <User className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-lg font-semibold">Müşteri Bilgileri</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Müşteri Adı
                  </label>
                  <AyuInput
                    value={order.customer.name}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-posta
                  </label>
                  <AyuInput
                    value={order.customer.email}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                {order.customer.phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefon
                    </label>
                    <AyuInput
                      value={order.customer.phone}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                )}
              </div>
            </div>
          </AyuCard>

          {/* Order Items */}
          <AyuCard>
            <div className="p-6">
              <div className="flex items-center mb-4">
                <Package className="w-6 h-6 text-green-600 mr-3" />
                <h2 className="text-lg font-semibold">Sipariş Öğeleri</h2>
              </div>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.productName}</h4>
                      <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₺{item.price.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">Adet: {item.quantity}</p>
                      <p className="text-sm font-medium">₺{item.total.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AyuCard>

          {/* Shipping Address */}
          <AyuCard>
            <div className="p-6">
              <div className="flex items-center mb-4">
                <Truck className="w-6 h-6 text-purple-600 mr-3" />
                <h2 className="text-lg font-semibold">Teslimat Adresi</h2>
              </div>
              <div className="text-sm text-gray-600">
                <p><strong>{order.shippingAddress.name}</strong></p>
                <p>{order.shippingAddress.street1}</p>
                <p>{order.shippingAddress.city} {order.shippingAddress.postalCode}</p>
                <p>{order.shippingAddress.country}</p>
              </div>
            </div>
          </AyuCard>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          {/* Order Status */}
          <AyuCard>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Sipariş Durumu</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sipariş Durumu
                  </label>
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">Beklemede</option>
                    <option value="processing">İşleniyor</option>
                    <option value="shipped">Gönderildi</option>
                    <option value="completed">Tamamlandı</option>
                    <option value="cancelled">İptal Edildi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ödeme Durumu
                  </label>
                  <select
                    value={order.paymentStatus}
                    onChange={(e) => handlePaymentStatusChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">Beklemede</option>
                    <option value="paid">Ödendi</option>
                    <option value="failed">Başarısız</option>
                    <option value="refunded">İade Edildi</option>
                  </select>
                </div>
              </div>
            </div>
          </AyuCard>

          {/* Order Summary */}
          <AyuCard>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Sipariş Özeti</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ara Toplam:</span>
                  <span>₺{order.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">KDV:</span>
                  <span>₺{order.taxAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Kargo:</span>
                  <span>₺{order.shippingAmount.toLocaleString()}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>İndirim:</span>
                    <span>-₺{order.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <hr className="border-gray-200" />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Toplam:</span>
                  <span>₺{order.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </AyuCard>

          {/* Notes */}
          <AyuCard>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Notlar</h3>
              <textarea
                value={order.notes || ''}
                onChange={(e) => setOrder({ ...order, notes: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Sipariş notları..."
              />
            </div>
          </AyuCard>
        </div>
      </div>
    </div>
  );
};

export default OrderEditPage;
