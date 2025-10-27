'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AyuCard, AyuButton, AyuInput } from '@/components';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const EditSupplierPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const supplierId = params?.id as string;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Türkiye',
    taxNumber: '',
    paymentTerms: 'Net 30',
    creditLimit: '',
    status: 'active'
  });

  useEffect(() => {
    if (supplierId) {
      fetchSupplier();
    }
  }, [supplierId]);

  const fetchSupplier = async () => {
    try {
      setFetching(true);
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
        setFormData({
          name: supplier.name || supplier.companyName || '',
          code: supplier.code || supplier.supplierCode || '',
          contactPerson: supplier.contactPerson || supplier.contactName || '',
          email: supplier.email || '',
          phone: supplier.phone || supplier.phoneNumber || '',
          address: supplier.address || '',
          city: supplier.city || '',
          country: supplier.country || 'Türkiye',
          taxNumber: supplier.taxNumber || supplier.taxId || '',
          paymentTerms: supplier.paymentTerms || 'Net 30',
          creditLimit: supplier.creditLimit?.toString() || '0',
          status: supplier.status || 'active'
        });
      } else {
        throw new Error(data.message || 'Tedarikçi bilgileri yüklenemedi');
      }
    } catch (error) {
      console.error('Error fetching supplier:', error);
      toast.error('Tedarikçi bilgileri yüklenirken hata oluştu');
      router.push('/suppliers');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const response = await fetch(`/api/proxy/suppliers/${supplierId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          creditLimit: parseFloat(formData.creditLimit) || 0
        }),
      });

      if (!response.ok) {
        throw new Error('Tedarikçi güncellenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Tedarikçi başarıyla güncellendi');
        router.push('/suppliers');
      } else {
        throw new Error(data.message || 'Tedarikçi güncellenemedi');
      }
    } catch (error) {
      console.error('Error updating supplier:', error);
      toast.error('Tedarikçi güncellenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="p-6">
        <div className="text-center">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <AyuButton
          variant="ghost"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri
        </AyuButton>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tedarikçi Düzenle</h1>
          <p className="text-gray-600 mt-2">Tedarikçi bilgilerini güncelleyin</p>
        </div>
      </div>

      <AyuCard>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Firma Adı *</label>
              <AyuInput
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Firma adını girin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tedarikçi Kodu</label>
              <AyuInput
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Tedarikçi kodu"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">İletişim Kişisi *</label>
              <AyuInput
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                required
                placeholder="İletişim kişisini girin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">E-posta *</label>
              <AyuInput
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Telefon *</label>
              <AyuInput
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                placeholder="+90 555 123 4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Vergi Numarası</label>
              <AyuInput
                value={formData.taxNumber}
                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                placeholder="Vergi numarasını girin"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Adres</label>
              <AyuInput
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Adres bilgisini girin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Şehir</label>
              <AyuInput
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Şehir adını girin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ülke</label>
              <AyuInput
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="Ülke adını girin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ödeme Koşulları</label>
              <select
                className="form-input"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
              >
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 60">Net 60</option>
                <option value="Net 90">Net 90</option>
                <option value="Cash">Nakit</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Kredi Limiti (₺)</label>
              <AyuInput
                type="number"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Durum</label>
              <select
                className="form-input"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
                <option value="pending">Beklemede</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <AyuButton
              type="submit"
              variant="primary"
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Güncelleniyor...' : 'Güncelle'}
            </AyuButton>
            <AyuButton
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              İptal
            </AyuButton>
          </div>
        </form>
      </AyuCard>
    </div>
  );
};

export default EditSupplierPage;

