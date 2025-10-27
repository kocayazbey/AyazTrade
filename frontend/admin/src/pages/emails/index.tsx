import React, { useState, useEffect } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import Header from '../../../components/layout/Header';
import { Plus, Search, Filter, Edit, Trash2, Eye, Mail, Send, FileText } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: string;
  status: 'draft' | 'active' | 'inactive';
  lastUsed: string;
  createdAt: string;
  createdBy: string;
  usageCount: number;
}

const EmailsPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/proxy/emails/templates', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('E-posta şablonları yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        const transformedTemplates: EmailTemplate[] = (data.data?.templates || data.data || []).map((template: any) => ({
          id: template.id,
          name: template.name || '',
          subject: template.subject || '',
          category: template.category || 'Genel',
          status: template.status || 'active',
          lastUsed: template.lastUsed ? new Date(template.lastUsed).toISOString().split('T')[0] : '',
          createdAt: template.createdAt ? new Date(template.createdAt).toISOString().split('T')[0] : '',
          createdBy: template.createdBy?.name || template.createdBy || 'Sistem',
          usageCount: template.usageCount || 0,
        }));
        setTemplates(transformedTemplates);
      } else {
        setTemplates([]);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template => {
    return template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           template.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
           template.category.toLowerCase().includes(searchTerm.toLowerCase());
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
                <h1 className="text-3xl font-bold text-gray-900">E-posta Şablonları</h1>
                <p className="text-gray-600 mt-1">E-posta şablonlarını yönetin</p>
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Yeni Şablon
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Şablon ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şablon</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Konu</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanım</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Yükleniyor...</td></tr>
                    ) : filteredTemplates.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Şablon bulunamadı</td></tr>
                    ) : (
                      filteredTemplates.map((template) => (
                        <tr key={template.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                  <Mail className="w-5 h-5 text-blue-600" />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{template.name}</div>
                                <div className="text-sm text-gray-500">{template.createdBy}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{template.subject}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{template.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              template.status === 'active' ? 'bg-green-100 text-green-800' : 
                              template.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {template.status === 'active' ? 'Aktif' : template.status === 'draft' ? 'Taslak' : 'Pasif'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{template.usageCount}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button className="text-blue-600 hover:text-blue-900"><Eye className="w-4 h-4" /></button>
                              <button className="text-green-600 hover:text-green-900"><Send className="w-4 h-4" /></button>
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

export default EmailsPage;
