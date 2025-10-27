'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Header from '../../../components/layout/Header';
import { Search, Plus, Edit, Trash2, Image } from 'lucide-react';
import toast from 'react-hot-toast';

interface Banner {
  id: string;
  title: string;
  image: string;
  position: string;
  status: 'active' | 'inactive';
  startDate: string;
  endDate: string;
  clicks: number;
}

export default function BannersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/proxy/content/banners', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Bannerlar yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        const transformedBanners: Banner[] = (data.data?.banners || data.data || []).map((banner: any) => ({
          id: banner.id,
          title: banner.title || banner.name || '',
          image: banner.image || banner.imageUrl || '',
          position: banner.position || banner.location || 'header',
          status: banner.status || banner.isActive ? 'active' : 'inactive',
          startDate: banner.startDate ? new Date(banner.startDate).toISOString().split('T')[0] : '',
          endDate: banner.endDate ? new Date(banner.endDate).toISOString().split('T')[0] : '',
          clicks: banner.clicks || banner.clickCount || 0,
        }));
        setBanners(transformedBanners);
      } else {
        setBanners([]);
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu banner\'ı silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`/api/proxy/content/banners/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Banner silinemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Banner başarıyla silindi');
        fetchBanners();
      }
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast.error('Banner silinirken hata oluştu');
    }
  };

  const filteredBanners = banners.filter(banner =>
    banner.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    banner.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bannerlar</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Reklam bannerlarını yönetin</p>
              </div>
              <button 
                onClick={() => toast.info('Banner oluşturma özelliği yakında eklenecek')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Yeni Banner
              </button>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Banner ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : filteredBanners.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Banner bulunamadı
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                  {filteredBanners.map((banner) => (
                    <div key={banner.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <div className="relative h-48 bg-gray-100 dark:bg-gray-800">
                        {banner.image ? (
                          <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                        <span className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                          banner.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {banner.status === 'active' ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{banner.title}</h3>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          <div>Konum: {banner.position}</div>
                          <div>Tıklama: {banner.clicks}</div>
                          <div>Tarih: {banner.startDate} - {banner.endDate}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toast.info('Banner düzenleme özelliği yakında eklenecek')}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            Düzenle
                          </button>
                          <button
                            onClick={() => handleDelete(banner.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

