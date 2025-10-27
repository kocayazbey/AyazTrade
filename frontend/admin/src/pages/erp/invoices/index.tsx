import React, { useState, useEffect } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Header from '../../../components/layout/Header';
import { Plus, Search, Filter, Edit, Trash2, Eye, Download, Send, FileText, DollarSign, Calendar } from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  dueDate: string;
  issueDate: string;
  paidDate: string;
  paymentMethod: string;
  createdAt: string;
}

const InvoicesPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/proxy/erp/invoices', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Faturalar yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        // Transform backend data to frontend format
        const transformedInvoices: Invoice[] = data.data.invoices.map((invoice: any) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber || invoice.number,
          customerName: invoice.customer?.name || invoice.customerName || 'Bilinmeyen Müşteri',
          customerEmail: invoice.customer?.email || invoice.customerEmail || '',
          status: invoice.status || 'draft',
          totalAmount: parseFloat(invoice.totalAmount) || 0,
          taxAmount: parseFloat(invoice.taxAmount) || 0,
          netAmount: parseFloat(invoice.netAmount) || 0,
          dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
          issueDate: invoice.issueDate ? new Date(invoice.issueDate).toISOString().split('T')[0] : '',
          paidDate: invoice.paidDate ? new Date(invoice.paidDate).toISOString().split('T')[0] : '',
          paymentMethod: invoice.paymentMethod || '',
          createdAt: invoice.createdAt ? new Date(invoice.createdAt).toISOString().split('T')[0] : ''
        }));
        setInvoices(transformedInvoices);
      } else {
        throw new Error(data.message || 'Faturalar yüklenemedi');
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-800',
      'sent': 'bg-blue-100 text-blue-800',
      'paid': 'bg-green-100 text-green-800',
      'overdue': 'bg-red-100 text-red-800',
      'cancelled': 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts = {
      'draft': 'Taslak',
      'sent': 'Gönderildi',
      'paid': 'Ödendi',
      'overdue': 'Vadesi Geçti',
      'cancelled': 'İptal Edildi'
    };
    return texts[status] || status;
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
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
                <h1 className="text-3xl font-bold text-gray-900">Faturalar</h1>
                <p className="text-gray-600 mt-1">Fatura yönetimi ve takibi</p>
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Yeni Fatura
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
                    <p className="text-sm font-medium text-gray-600">Toplam Fatura</p>
                    <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-green-100">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Ödenen</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {invoices.filter(i => i.status === 'paid').length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-red-100">
                    <DollarSign className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Vadesi Geçen</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {invoices.filter(i => i.status === 'overdue').length}
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
                    <p className="text-sm font-medium text-gray-600">Toplam Tutar</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₺{invoices.reduce((sum, i) => sum + i.totalAmount, 0).toLocaleString()}
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
                      placeholder="Fatura ara..."
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
                  <option value="sent">Gönderildi</option>
                  <option value="paid">Ödendi</option>
                  <option value="overdue">Vadesi Geçti</option>
                  <option value="cancelled">İptal Edildi</option>
                </select>
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtrele
                </button>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fatura No
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Müşteri
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tutar
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vade Tarihi
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ödeme
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                          Yükleniyor...
                        </td>
                      </tr>
                    ) : filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                          Fatura bulunamadı
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((invoice) => {
                        const daysUntilDue = getDaysUntilDue(invoice.dueDate);
                        return (
                          <tr key={invoice.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                              <div className="text-sm text-gray-500">{invoice.issueDate}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{invoice.customerName}</div>
                              <div className="text-sm text-gray-500">{invoice.customerEmail}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                                {getStatusText(invoice.status)}
                              </span>
                              {invoice.status === 'sent' && daysUntilDue <= 7 && daysUntilDue > 0 && (
                                <div className="text-xs text-orange-600 mt-1">
                                  {daysUntilDue} gün kaldı
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">₺{invoice.totalAmount.toLocaleString()}</div>
                              <div className="text-xs text-gray-500">
                                Net: ₺{invoice.netAmount.toLocaleString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {invoice.dueDate}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {invoice.paymentMethod || '-'}
                              {invoice.paidDate && (
                                <div className="text-xs text-green-600">
                                  Ödendi: {invoice.paidDate}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <button className="text-blue-600 hover:text-blue-900" title="Görüntüle">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button className="text-green-600 hover:text-green-900" title="İndir">
                                  <Download className="w-4 h-4" />
                                </button>
                                <button className="text-purple-600 hover:text-purple-900" title="Gönder">
                                  <Send className="w-4 h-4" />
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

export default InvoicesPage;
