import React, { useState, useEffect } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Header from '../../../components/layout/Header';
import { Plus, Search, Filter, Edit, Trash2, Eye, Download, FileText, Calendar, DollarSign } from 'lucide-react';

interface Contract {
  id: string;
  contractNumber: string;
  customerName: string;
  customerEmail: string;
  status: 'draft' | 'pending' | 'active' | 'expired' | 'terminated' | 'renewed';
  totalValue: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  renewalDate: string;
  assignedTo: string;
  contractType: string;
}

const ContractsPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/proxy/crm/contracts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Sözleşmeler yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        // Transform backend data to frontend format
        const transformedContracts: Contract[] = (data.data?.contracts || data.data || []).map((contract: any) => ({
          id: contract.id,
          contractNumber: contract.contractNumber || contract.number || `CNT-${contract.id}`,
          customerName: contract.customer?.name || contract.customerName || 'Bilinmeyen Müşteri',
          customerEmail: contract.customer?.email || contract.customerEmail || '',
          status: contract.status || 'draft',
          totalValue: parseFloat(contract.totalValue) || 0,
          startDate: contract.startDate ? new Date(contract.startDate).toISOString().split('T')[0] : '',
          endDate: contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : '',
          createdAt: contract.createdAt ? new Date(contract.createdAt).toISOString().split('T')[0] : '',
          renewalDate: contract.renewalDate ? new Date(contract.renewalDate).toISOString().split('T')[0] : '',
          assignedTo: contract.assignedTo?.name || contract.assignedTo || 'Atanmamış',
          contractType: contract.contractType || contract.type || 'Belirtilmemiş',
        }));
        setContracts(transformedContracts);
      } else {
        setContracts([]);
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'active': 'bg-green-100 text-green-800',
      'expired': 'bg-red-100 text-red-800',
      'terminated': 'bg-orange-100 text-orange-800',
      'renewed': 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts = {
      'draft': 'Taslak',
      'pending': 'Beklemede',
      'active': 'Aktif',
      'expired': 'Süresi Doldu',
      'terminated': 'Sonlandırıldı',
      'renewed': 'Yenilendi'
    };
    return texts[status] || status;
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getDaysUntilExpiry = (endDate: string) => {
    const today = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Sözleşmeler</h1>
                <p className="text-gray-600 mt-1">Müşteri sözleşmelerini yönetin</p>
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Yeni Sözleşme
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Toplam Sözleşme</p>
                    <p className="text-2xl font-bold text-gray-900">{contracts.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-green-100">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Aktif</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {contracts.filter(c => c.status === 'active').length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-yellow-100">
                    <FileText className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Yakında Dolacak</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {contracts.filter(c => {
                        const days = getDaysUntilExpiry(c.endDate);
                        return days <= 30 && days > 0 && c.status === 'active';
                      }).length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Toplam Değer</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₺{contracts.reduce((sum, c) => sum + c.totalValue, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Sözleşme ara..."
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
                  <option value="draft">Taslak</option>
                  <option value="pending">Beklemede</option>
                  <option value="active">Aktif</option>
                  <option value="expired">Süresi Doldu</option>
                  <option value="terminated">Sonlandırıldı</option>
                  <option value="renewed">Yenilendi</option>
                </select>
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtrele
                </button>
              </div>
            </div>

            {/* Contracts Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sözleşme No
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Müşteri
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Değer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Başlangıç
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bitiş
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tip
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                          Yükleniyor...
                        </td>
                      </tr>
                    ) : filteredContracts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                          Sözleşme bulunamadı
                        </td>
                      </tr>
                    ) : (
                      filteredContracts.map((contract) => {
                        const daysUntilExpiry = getDaysUntilExpiry(contract.endDate);
                        return (
                          <tr key={contract.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{contract.contractNumber}</div>
                              <div className="text-sm text-gray-500">{contract.createdAt}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{contract.customerName}</div>
                              <div className="text-sm text-gray-500">{contract.customerEmail}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contract.status)}`}>
                                {getStatusText(contract.status)}
                              </span>
                              {contract.status === 'active' && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
                                <div className="text-xs text-orange-600 mt-1">
                                  {daysUntilExpiry} gün kaldı
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ₺{contract.totalValue.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {contract.startDate}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {contract.endDate}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {contract.contractType}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <button className="text-blue-600 hover:text-blue-900" title="Görüntüle">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button className="text-green-600 hover:text-green-900" title="İndir">
                                  <Download className="w-4 h-4" />
                                </button>
                                <button className="text-indigo-600 hover:text-indigo-900" title="Düzenle">
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button className="text-red-600 hover:text-red-900" title="Sil">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
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

export default ContractsPage;
