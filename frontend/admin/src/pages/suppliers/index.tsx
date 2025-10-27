'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AyuCard, AyuButton, AyuInput, AyuTable, AyuBadge, AyuModal } from '@/components';
import { Search, Filter, Download, Eye, Edit, Trash2, RefreshCw, Plus, Building2, Phone, Mail, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/shared/Pagination';

interface Supplier {
  id: string;
  name: string;
  code: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  taxNumber: string;
  status: 'active' | 'inactive' | 'pending';
  paymentTerms: string;
  creditLimit: number;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

interface SupplierFilters {
  status: string;
  search: string;
  city: string;
  page: number;
  limit: number;
}

interface SuppliersResponse {
  success: boolean;
  data: {
    suppliers: Supplier[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const SuppliersPage: React.FC = () => {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });
  const [filters, setFilters] = useState<SupplierFilters>({
    status: '',
    search: '',
    city: '',
    page: 1,
    limit: 20
  });
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, [filters]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.city) queryParams.append('city', filters.city);
      queryParams.append('page', filters.page.toString());
      queryParams.append('limit', filters.limit.toString());

      const response = await fetch(`/api/proxy/suppliers?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Tedarikçiler yüklenemedi');
      }

      const data: SuppliersResponse = await response.json();

      if (data.success) {
        const transformedSuppliers: Supplier[] = (data.data?.suppliers || []).map((supplier: any) => ({
          id: supplier.id,
          name: supplier.name || supplier.companyName || '',
          code: supplier.code || supplier.supplierCode || `SUP-${supplier.id}`,
          contactPerson: supplier.contactPerson || supplier.contactName || '',
          email: supplier.email || '',
          phone: supplier.phone || supplier.phoneNumber || '',
          address: supplier.address || '',
          city: supplier.city || '',
          country: supplier.country || 'Türkiye',
          taxNumber: supplier.taxNumber || supplier.taxId || '',
          status: supplier.status || 'active',
          paymentTerms: supplier.paymentTerms || 'Net 30',
          creditLimit: parseFloat(supplier.creditLimit) || 0,
          balance: parseFloat(supplier.balance) || 0,
          createdAt: supplier.createdAt || '',
          updatedAt: supplier.updatedAt || ''
        }));
        setSuppliers(transformedSuppliers);
        setPagination({
          total: data.data.total,
          page: data.data.page,
          limit: data.data.limit,
          totalPages: data.data.totalPages
        });
      } else {
        throw new Error(data.message || 'Tedarikçiler yüklenemedi');
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Tedarikçiler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (supplierId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/proxy/suppliers/${supplierId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await fetchSuppliers();
          toast.success('Tedarikçi durumu güncellendi');
        } else {
          throw new Error(data.message || 'Durum güncellenemedi');
        }
      } else {
        throw new Error('Durum güncellenemedi');
      }
    } catch (error) {
      console.error('Error updating supplier status:', error);
      toast.error('Tedarikçi durumu güncellenirken hata oluştu');
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    if (window.confirm('Bu tedarikçiyi silmek istediğinizden emin misiniz?')) {
      try {
        const response = await fetch(`/api/proxy/suppliers/${supplierId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            await fetchSuppliers();
            toast.success('Tedarikçi başarıyla silindi');
          } else {
            throw new Error(data.message || 'Tedarikçi silinemedi');
          }
        } else {
          throw new Error('Tedarikçi silinemedi');
        }
      } catch (error) {
        console.error('Error deleting supplier:', error);
        toast.error('Tedarikçi silinirken hata oluştu');
      }
    }
  };

  const handleViewSupplier = async (supplierId: string) => {
    try {
      const response = await fetch(`/api/proxy/suppliers/${supplierId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Tedarikçi bilgileri yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success && data.data.supplier) {
        const supplier = data.data.supplier;
        setSelectedSupplier({
          id: supplier.id,
          name: supplier.name || supplier.companyName || '',
          code: supplier.code || supplier.supplierCode || '',
          contactPerson: supplier.contactPerson || supplier.contactName || '',
          email: supplier.email || '',
          phone: supplier.phone || supplier.phoneNumber || '',
          address: supplier.address || '',
          city: supplier.city || '',
          country: supplier.country || 'Türkiye',
          taxNumber: supplier.taxNumber || supplier.taxId || '',
          status: supplier.status || 'active',
          paymentTerms: supplier.paymentTerms || 'Net 30',
          creditLimit: parseFloat(supplier.creditLimit) || 0,
          balance: parseFloat(supplier.balance) || 0,
          createdAt: supplier.createdAt || '',
          updatedAt: supplier.updatedAt || ''
        });
        setSupplierModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching supplier details:', error);
      toast.error('Tedarikçi bilgileri yüklenirken hata oluştu');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'warning';
      case 'pending': return 'info';
      default: return 'default';
    }
  };

  const getSupplierStats = () => {
    const total = suppliers.length;
    const active = suppliers.filter(s => s.status === 'active').length;
    const totalCreditLimit = suppliers.reduce((sum, s) => sum + s.creditLimit, 0);
    const totalBalance = suppliers.reduce((sum, s) => sum + s.balance, 0);
    const overdue = suppliers.filter(s => s.balance > s.creditLimit).length;

    return { total, active, totalCreditLimit, totalBalance, overdue };
  };

  const stats = getSupplierStats();

  const columns = [
    {
      key: 'supplier',
      title: 'Tedarikçi',
      render: (value: any, record: Supplier) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-medium">{record.name}</div>
            <div className="text-sm text-gray-500">Kod: {record.code}</div>
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      title: 'İletişim',
      render: (value: any, record: Supplier) => (
        <div>
          <div className="flex items-center gap-1 text-sm">
            <Phone className="w-3 h-3" />
            {record.phone}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Mail className="w-3 h-3" />
            {record.email}
          </div>
        </div>
      )
    },
    {
      key: 'location',
      title: 'Konum',
      render: (value: any, record: Supplier) => (
        <div className="flex items-center gap-1 text-sm">
          <MapPin className="w-3 h-3" />
          {record.city}, {record.country}
        </div>
      )
    },
    {
      key: 'creditLimit',
      title: 'Kredi Limiti',
      dataIndex: 'creditLimit',
      render: (value: number) => (
        <span className="font-medium">₺{value.toLocaleString()}</span>
      )
    },
    {
      key: 'balance',
      title: 'Bakiye',
      dataIndex: 'balance',
      render: (value: number, record: Supplier) => {
        const isOverdue = value > record.creditLimit;
        return (
          <span className={`font-medium ${isOverdue ? 'text-error' : ''}`}>
            ₺{value.toLocaleString()}
          </span>
        );
      }
    },
    {
      key: 'status',
      title: 'Durum',
      dataIndex: 'status',
      render: (value: string) => (
        <AyuBadge variant={getStatusColor(value) as any}>
          {value === 'active' ? 'Aktif' : value === 'inactive' ? 'Pasif' : 'Beklemede'}
        </AyuBadge>
      )
    },
    {
      key: 'actions',
      title: 'İşlemler',
      render: (value: any, record: Supplier) => (
        <div className="flex gap-2">
          <AyuButton
            size="sm"
            variant="ghost"
            onClick={() => handleViewSupplier(record.id)}
          >
            <Eye className="w-4 h-4" />
          </AyuButton>
          <AyuButton
            size="sm"
            variant="ghost"
            onClick={() => router.push(`/suppliers/${record.id}/edit`)}
          >
            <Edit className="w-4 h-4" />
          </AyuButton>
          <AyuButton
            size="sm"
            variant="ghost"
            onClick={() => handleDeleteSupplier(record.id)}
            className="text-error hover:text-error"
          >
            <Trash2 className="w-4 h-4" />
          </AyuButton>
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Tedarikçi Yönetimi</h1>
        <p className="text-gray-600 mt-2">Tüm tedarikçileri görüntüleyin ve yönetin</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <AyuCard>
          <div className="p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">Toplam Tedarikçi</div>
            <div className="text-3xl font-bold text-primary">{stats.total}</div>
          </div>
        </AyuCard>
        
        <AyuCard>
          <div className="p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">Aktif</div>
            <div className="text-3xl font-bold text-success">{stats.active}</div>
          </div>
        </AyuCard>
        
        <AyuCard>
          <div className="p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">Toplam Kredi Limiti</div>
            <div className="text-3xl font-bold text-info">₺{stats.totalCreditLimit.toLocaleString()}</div>
          </div>
        </AyuCard>
        
        <AyuCard>
          <div className="p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">Toplam Bakiye</div>
            <div className="text-3xl font-bold text-warning">₺{stats.totalBalance.toLocaleString()}</div>
          </div>
        </AyuCard>
        
        <AyuCard>
          <div className="p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">Aşım Durumunda</div>
            <div className="text-3xl font-bold text-error">{stats.overdue}</div>
          </div>
        </AyuCard>
      </div>

      {/* Filters */}
      <AyuCard className="mb-6">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AyuInput
              placeholder="Tedarikçi ara..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="w-full"
            />
            
            <select
              className="form-input"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            >
              <option value="">Tüm Durumlar</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
              <option value="pending">Beklemede</option>
            </select>
            
            <AyuInput
              placeholder="Şehir ara..."
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value, page: 1 })}
              className="w-full"
            />
            
            <div className="flex gap-2">
              <AyuButton
                variant="outline"
                onClick={fetchSuppliers}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Yenile
              </AyuButton>
              <AyuButton
                variant="primary"
                className="flex-1"
                onClick={() => router.push('/suppliers/add')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Yeni Tedarikçi
              </AyuButton>
            </div>
          </div>
        </div>
      </AyuCard>

      {/* Suppliers Table */}
      <AyuCard>
        <AyuTable
          columns={columns}
          data={suppliers}
          loading={loading}
          emptyText="Tedarikçi bulunamadı"
          hoverable
        />
      </AyuCard>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            onPageChange={(page) => setFilters({ ...filters, page })}
          />
        </div>
      )}

      {/* Supplier Details Modal */}
      <AyuModal
        isOpen={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        title={`Tedarikçi Detayları - ${selectedSupplier?.name}`}
        size="lg"
      >
        {selectedSupplier && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Firma Adı:</span> {selectedSupplier.name}
              </div>
              <div>
                <span className="font-medium">Kod:</span> {selectedSupplier.code}
              </div>
              <div>
                <span className="font-medium">İletişim Kişisi:</span> {selectedSupplier.contactPerson}
              </div>
              <div>
                <span className="font-medium">E-posta:</span> {selectedSupplier.email}
              </div>
              <div>
                <span className="font-medium">Telefon:</span> {selectedSupplier.phone}
              </div>
              <div>
                <span className="font-medium">Vergi No:</span> {selectedSupplier.taxNumber}
              </div>
              <div>
                <span className="font-medium">Adres:</span> {selectedSupplier.address}
              </div>
              <div>
                <span className="font-medium">Şehir:</span> {selectedSupplier.city}
              </div>
              <div>
                <span className="font-medium">Ülke:</span> {selectedSupplier.country}
              </div>
              <div>
                <span className="font-medium">Ödeme Koşulları:</span> {selectedSupplier.paymentTerms}
              </div>
              <div>
                <span className="font-medium">Kredi Limiti:</span> ₺{selectedSupplier.creditLimit.toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Bakiye:</span> ₺{selectedSupplier.balance.toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Durum:</span>
                <AyuBadge variant={getStatusColor(selectedSupplier.status) as any} className="ml-2">
                  {selectedSupplier.status === 'active' ? 'Aktif' : selectedSupplier.status === 'inactive' ? 'Pasif' : 'Beklemede'}
                </AyuBadge>
              </div>
            </div>
          </div>
        )}
      </AyuModal>
    </div>
  );
};

export default SuppliersPage;

