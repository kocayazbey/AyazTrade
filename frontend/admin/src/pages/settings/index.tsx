import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { Save, RefreshCw, Database, Mail, Bell, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const SettingsPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    companyName: 'AyazTrade',
    email: 'info@ayaztrade.com',
    phone: '+90 212 555 0123',
    address: 'İstanbul, Türkiye',
    timezone: 'Europe/Istanbul',
    currency: 'TRY',
    language: 'tr'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/proxy/settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Ayarlar yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        const settingsData = data.data;
        setSettings({
          companyName: settingsData.companyName || settings.companyName,
          email: settingsData.email || settingsData.companyEmail || settings.email,
          phone: settingsData.phone || settingsData.companyPhone || settings.phone,
          address: settingsData.address || settingsData.companyAddress || settings.address,
          timezone: settingsData.timezone || settings.timezone,
          currency: settingsData.currency || settings.currency,
          language: settingsData.language || settings.language,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Use default settings on error
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/proxy/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Ayarlar kaydedilemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Ayarlar başarıyla kaydedildi');
      } else {
        throw new Error(data.message || 'Ayarlar kaydedilemedi');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Ayarlar kaydedilirken hata oluştu');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Sistem Ayarları</h1>
                <p className="text-gray-600 mt-1">Genel sistem ayarlarını yönetin</p>
              </div>
              <button 
                onClick={handleSave}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Kaydet
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  Genel Bilgiler
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Şirket Adı</label>
                    <input
                      type="text"
                      value={settings.companyName}
                      onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">E-posta</label>
                    <input
                      type="email"
                      value={settings.email}
                      onChange={(e) => setSettings({...settings, email: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Telefon</label>
                    <input
                      type="text"
                      value={settings.phone}
                      onChange={(e) => setSettings({...settings, phone: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  Bildirimler
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">E-posta Bildirimleri</span>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">SMS Bildirimleri</span>
                    <input type="checkbox" className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Push Bildirimleri</span>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Güvenlik
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Oturum Süresi (dakika)</label>
                    <input type="number" defaultValue="30" className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">2FA Zorunlu</span>
                    <input type="checkbox" className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">IP Kısıtlaması</span>
                    <input type="checkbox" className="rounded" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Mail className="w-5 h-5 mr-2" />
                  E-posta Ayarları
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SMTP Sunucu</label>
                    <input type="text" defaultValue="smtp.gmail.com" className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Port</label>
                    <input type="number" defaultValue="587" className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Güvenlik</label>
                    <select className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2">
                      <option value="tls">TLS</option>
                      <option value="ssl">SSL</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
