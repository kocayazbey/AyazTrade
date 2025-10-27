'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Header from '../../../components/layout/Header';
import { Search, Plus, Edit, Trash2, Eye, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface Blog {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: 'published' | 'draft';
  author: string;
  publishedAt?: string;
  views: number;
}

export default function BlogsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/proxy/content/blogs', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Blog yazıları yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        const transformedBlogs: Blog[] = (data.data?.blogs || data.data || []).map((blog: any) => ({
          id: blog.id,
          title: blog.title || '',
          slug: blog.slug || '',
          category: blog.category?.name || blog.category || 'Genel',
          status: blog.status || 'draft',
          author: blog.author?.name || blog.author || 'Sistem',
          publishedAt: blog.publishedAt ? new Date(blog.publishedAt).toISOString().split('T')[0] : undefined,
          views: blog.views || 0,
        }));
        setBlogs(transformedBlogs);
      } else {
        setBlogs([]);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu blog yazısını silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`/api/proxy/content/blogs/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Blog yazısı silinemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Blog yazısı başarıyla silindi');
        fetchBlogs();
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
      toast.error('Blog yazısı silinirken hata oluştu');
    }
  };

  const filteredBlogs = blogs.filter(blog =>
    blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    blog.category.toLowerCase().includes(searchTerm.toLowerCase())
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Blog Yazıları</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Blog içeriklerini yönetin</p>
              </div>
              <button 
                onClick={() => toast.info('Blog yazısı oluşturma özelliği yakında eklenecek')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Yeni Yazı
              </button>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Blog yazısı ara..."
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
              ) : filteredBlogs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Blog yazısı bulunamadı
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Başlık</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kategori</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durum</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Yazar</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Görüntülenme</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredBlogs.map((blog) => (
                        <tr key={blog.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                            {blog.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {blog.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              blog.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {blog.status === 'published' ? 'Yayında' : 'Taslak'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {blog.author}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {blog.views}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => toast.info('Blog yazısı görüntüleme özelliği yakında eklenecek')}
                                className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => toast.info('Blog yazısı düzenleme özelliği yakında eklenecek')}
                                className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(blog.id)}
                                className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

