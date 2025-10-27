import React, { useState, useEffect } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Header from '../../../components/layout/Header';
import { Plus, Search, Filter, Edit, Trash2, Eye, Truck, Package, MapPin, Clock } from 'lucide-react';

interface Transfer {
  id: string;
  transferNumber: string;
  fromWarehouse: string;
  toWarehouse: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled';
  totalItems: number;
  totalValue: number;
  requestedBy: string;
  approvedBy: string;
  requestedDate: string;
  scheduledDate: string;
  completedDate: string;
  notes: string;
}

const TransfersPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/proxy/wms/transfers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Transferler yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        const transformedTransfers: Transfer[] = (data.data?.transfers || data.data || []).map((transfer: any) => ({
          id: transfer.id,
          transferNumber: transfer.transferNumber || transfer.number || `TRF-${transfer.id}`,
          fromWarehouse: transfer.fromWarehouse?.name || transfer.fromWarehouse || '',
          toWarehouse: transfer.toWarehouse?.name || transfer.toWarehouse || '',
          status: transfer.status || 'pending',
          totalItems: transfer.totalItems || transfer.itemCount || 0,
          totalValue: parseFloat(transfer.totalValue) || 0,
          requestedBy: transfer.requestedBy?.name || transfer.requestedBy || '',
          approvedBy: transfer.approvedBy?.name || transfer.approvedBy || '',
          requestedDate: transfer.requestedDate ? new Date(transfer.requestedDate).toISOString().split('T')[0] : '',
          scheduledDate: transfer.scheduledDate ? new Date(transfer.scheduledDate).toISOString().split('T')[0] : '',
          completedDate: transfer.completedDate ? new Date(transfer.completedDate).toISOString().split('T')[0] : '',
          notes: transfer.notes || transfer.description || '',
        }));
        setTransfers(transformedTransfers);
      } else {
        setTransfers([]);
      }
    } catch (error) {
      console.error('Error fetching transfers:', error);
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'in_transit': 'bg-blue-100 text-blue-800',
      'delivered': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts = {
      'pending': 'Beklemede',
      'in_transit': 'Yolda',
      'delivered': 'Teslim Edildi',
      'cancelled': 'İptal Edildi'
    };
    return texts[status] || status;
  };

  const filteredTransfers = transfers.filter(transfer => {
    const matchesSearch = transfer.transferNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transfer.fromWarehouse.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transfer.toWarehouse.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || transfer.status === statusFilter;
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
                <h1 className="text-3xl font-bold text-gray-900">Transfer İşlemleri</h1>
                <p className="text-gray-600 mt-1">Depo transferlerini yönetin</p>
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Yeni Transfer
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Transfer ara..."
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
                  <option value="in_transit">Yolda</option>
                  <option value="delivered">Teslim Edildi</option>
                  <option value="cancelled">İptal Edildi</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transfer No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kaynak</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hedef</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün Sayısı</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan={8} className="px-6 py-4 text-center text-gray-500">Yükleniyor...</td></tr>
                    ) : filteredTransfers.length === 0 ? (
                      <tr><td colSpan={8} className="px-6 py-4 text-center text-gray-500">Transfer bulunamadı</td></tr>
                    ) : (
                      filteredTransfers.map((transfer) => (
                        <tr key={transfer.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{transfer.transferNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transfer.fromWarehouse}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transfer.toWarehouse}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transfer.status)}`}>
                              {getStatusText(transfer.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.totalItems}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₺{transfer.totalValue.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transfer.scheduledDate}</td>
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

export default TransfersPage;
