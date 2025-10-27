'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AyuCard, AyuButton, AyuInput } from '@/components';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const AddSupplierPage: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const response = await fetch('/api/proxy/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          creditLimit: parseFloat(formData.creditLimit) || 0
        }),
      });

      if (!response.ok) {
        throw new Error('Tedarikçi oluşturulamadı');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Tedarikçi başarıyla oluşturuldu');
        router.push('/suppliers');
      } else {
        throw new Error(data.message || 'Tedarikçi oluşturulamadı');
      }
    } catch (error) {
      console.error('Error creating supplier:', error);
      toast.error('Tedarikçi oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Yeni Tedarikçi Ekle</h1>
          <p className="text-gray-600 mt-2">Yeni bir tedarikçi ekleyin</p>
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
                placeholder="Otomatik oluşturulacak"
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
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
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

export default AddSupplierPage;

