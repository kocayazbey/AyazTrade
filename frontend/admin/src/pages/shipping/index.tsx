import React, { useState, useEffect } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Header from '../../../components/layout/Header';
import { Plus, Search, Filter, Edit, Trash2, Eye, Truck, Package, MapPin, Clock } from 'lucide-react';

interface Shipment {
  id: string;
  trackingNumber: string;
  orderNumber: string;
  customerName: string;
  status: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'returned';
  carrier: string;
  service: string;
  weight: number;
  dimensions: string;
  origin: string;
  destination: string;
  estimatedDelivery: string;
  actualDelivery: string;
  createdAt: string;
}

const ShippingPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/proxy/shipping/shipments', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Sevkiyatlar yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        // Transform backend data to frontend format
        const transformedShipments: Shipment[] = (data.data?.shipments || data.data || []).map((shipment: any) => ({
          id: shipment.id,
          trackingNumber: shipment.trackingNumber || shipment.tracking || '',
          orderNumber: shipment.orderNumber || shipment.order?.orderNumber || '',
          customerName: shipment.customerName || shipment.order?.customer?.name || 'Bilinmeyen Müşteri',
          status: shipment.status || 'pending',
          carrier: shipment.carrier || shipment.carrierName || '',
          service: shipment.service || shipment.serviceType || '',
          weight: parseFloat(shipment.weight) || 0,
          dimensions: shipment.dimensions || '',
          origin: shipment.origin || shipment.fromCity || '',
          destination: shipment.destination || shipment.toCity || '',
          estimatedDelivery: shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toISOString().split('T')[0] : '',
          actualDelivery: shipment.actualDelivery ? new Date(shipment.actualDelivery).toISOString().split('T')[0] : '',
          createdAt: shipment.createdAt ? new Date(shipment.createdAt).toISOString().split('T')[0] : '',
        }));
        setShipments(transformedShipments);
      } else {
        setShipments([]);
      }
    } catch (error) {
      console.error('Error fetching shipments:', error);
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'picked_up': 'bg-blue-100 text-blue-800',
      'in_transit': 'bg-purple-100 text-purple-800',
      'delivered': 'bg-green-100 text-green-800',
      'returned': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts = {
      'pending': 'Beklemede',
      'picked_up': 'Alındı',
      'in_transit': 'Yolda',
      'delivered': 'Teslim Edildi',
      'returned': 'İade Edildi'
    };
    return texts[status] || status;
  };

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = shipment.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shipment.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shipment.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Sevkiyat Yönetimi</h1>
                <p className="text-gray-600 mt-1">Kargo ve sevkiyat takibi</p>
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Yeni Sevkiyat
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Sevkiyat ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="pending">Beklemede</option>
                  <option value="picked_up">Alındı</option>
                  <option value="in_transit">Yolda</option>
                  <option value="delivered">Teslim Edildi</option>
                  <option value="returned">İade Edildi</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Takip No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sipariş</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kargo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hedef</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan={8} className="px-6 py-4 text-center text-gray-500">Yükleniyor...</td></tr>
                    ) : filteredShipments.length === 0 ? (
                      <tr><td colSpan={8} className="px-6 py-4 text-center text-gray-500">Sevkiyat bulunamadı</td></tr>
                    ) : (
                      filteredShipments.map((shipment) => (
                        <tr key={shipment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{shipment.trackingNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{shipment.orderNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{shipment.customerName}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(shipment.status)}`}>
                              {getStatusText(shipment.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{shipment.carrier}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{shipment.destination}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{shipment.estimatedDelivery}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button className="text-blue-600 hover:text-blue-900"><Eye className="w-4 h-4" /></button>
                              <button className="text-indigo-600 hover:text-indigo-900"><Edit className="w-4 h-4" /></button>
                              <button className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ShippingPage;
