import React, { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { Plus, Save, Eye, Code, Palette, Layout } from 'lucide-react';

const BuilderPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Sayfa Düzenleyici</h1>
                <p className="text-gray-600 mt-1">Drag & drop ile sayfa oluşturun</p>
              </div>
              <div className="flex gap-2">
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Kaydet
                </button>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Önizleme
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-lg font-semibold mb-4">Bileşenler</h3>
                  <div className="space-y-2">
                    <div className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <Layout className="w-5 h-5 inline mr-2" />
                      Layout
                    </div>
                    <div className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <Code className="w-5 h-5 inline mr-2" />
                      Text
                    </div>
                    <div className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <Palette className="w-5 h-5 inline mr-2" />
                      Button
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow p-6 min-h-96">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Layout className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Bileşenleri buraya sürükleyin</p>
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-lg font-semibold mb-4">Özellikler</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Genişlik</label>
                      <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Yükseklik</label>
                      <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default BuilderPage;
