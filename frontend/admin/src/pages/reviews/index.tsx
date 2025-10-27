'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { Search, Star, Trash2, Eye, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

interface Review {
  id: string;
  productName: string;
  customerName: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function ReviewsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchReviews();
  }, [statusFilter]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const url = statusFilter !== 'all' 
        ? `/api/proxy/reviews?status=${statusFilter}`
        : '/api/proxy/reviews';
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Değerlendirmeler yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        const transformedReviews: Review[] = (data.data?.reviews || data.data || []).map((review: any) => ({
          id: review.id,
          productName: review.product?.name || review.productName || '',
          customerName: review.customer?.name || review.customerName || 'Bilinmeyen Müşteri',
          rating: review.rating || 0,
          comment: review.comment || review.text || '',
          status: review.status || 'pending',
          createdAt: review.createdAt ? new Date(review.createdAt).toISOString().split('T')[0] : '',
        }));
        setReviews(transformedReviews);
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/proxy/reviews/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Durum güncellenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Değerlendirme ${status === 'approved' ? 'onaylandı' : 'reddedildi'}`);
        fetchReviews();
      } else {
        throw new Error(data.message || 'Durum güncellenemedi');
      }
    } catch (error) {
      console.error('Error updating review status:', error);
      toast.error('Durum güncellenirken hata oluştu');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu değerlendirmeyi silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`/api/proxy/reviews/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Değerlendirme silinemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Değerlendirme başarıyla silindi');
        fetchReviews();
      } else {
        throw new Error(data.message || 'Değerlendirme silinemedi');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Değerlendirme silinirken hata oluştu');
    }
  };

  const filteredReviews = reviews.filter(review =>
    review.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    review.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    review.comment.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Değerlendirmeler</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Ürün değerlendirmelerini yönetin</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="all">Tümü</option>
                    <option value="pending">Bekleyen</option>
                    <option value="approved">Onaylanan</option>
                    <option value="rejected">Reddedilen</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : filteredReviews.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Değerlendirme bulunamadı
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredReviews.map((review) => (
                    <div key={review.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{review.productName}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(review.status)}`}>
                              {review.status === 'approved' ? 'Onaylandı' : review.status === 'rejected' ? 'Reddedildi' : 'Bekliyor'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center">{renderStars(review.rating)}</div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">by {review.customerName}</span>
                            <span className="text-sm text-gray-400">•</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">{review.createdAt}</span>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300">{review.comment}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {review.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(review.id, 'approved')}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                              >
                                Onayla
                              </button>
                              <button
                                onClick={() => handleStatusChange(review.id, 'rejected')}
                                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                              >
                                Reddet
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(review.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
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

