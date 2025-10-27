'use client'

import { motion } from 'framer-motion'
import { Gift, Calendar, TrendingUp, Truck, Package, Clock } from 'lucide-react'

const campaigns = [
  {
    id: '1',
    name: 'Toplu Alım İndirimi - %15',
    description: '100+ adet alımlarda %15 indirim',
    type: 'volume',
    discount: '15%',
    status: 'active',
    startDate: '01 Ekim 2025',
    endDate: '31 Aralık 2025',
    minQty: 100,
    banner: 'https://via.placeholder.com/800x200/4A90E2/FFFFFF?text=Toplu+Alım+İndirimi',
    usageCount: 47,
  },
  {
    id: '2',
    name: 'Kış Sezonu Özel Fırsatı',
    description: 'Seçili ürünlerde %20 indirim',
    type: 'seasonal',
    discount: '20%',
    status: 'active',
    startDate: '01 Kasım 2025',
    endDate: '28 Şubat 2026',
    banner: 'https://via.placeholder.com/800x200/E74C3C/FFFFFF?text=Kış+Kampanyası',
    usageCount: 89,
  },
  {
    id: '3',
    name: 'Ücretsiz Kargo',
    description: '5.000 TL ve üzeri siparişlerde ücretsiz kargo',
    type: 'shipping',
    status: 'active',
    startDate: '15 Ekim 2025',
    endDate: '15 Ocak 2026',
    minAmount: 5000,
    icon: '🚚',
    usageCount: 234,
  },
  {
    id: '4',
    name: 'Yılbaşı Paketi',
    description: '3 Al 2 Öde',
    type: 'bundle',
    discount: '33%',
    status: 'scheduled',
    startDate: '15 Aralık 2025',
    endDate: '05 Ocak 2026',
    banner: 'https://via.placeholder.com/800x200/9B59B6/FFFFFF?text=Yılbaşı+Özel',
    maxUsage: 500,
    usageCount: 0,
  },
]

export default function CampaignsPage() {
  const activeCampaigns = campaigns.filter(c => c.status === 'active')
  const scheduledCampaigns = campaigns.filter(c => c.status === 'scheduled')

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl p-8 mb-6 shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <Gift className="w-12 h-12" />
            <div>
              <h1 className="text-3xl font-bold">Kampanyalar</h1>
              <p className="text-purple-100 mt-1">Size özel fırsatlardan yararlanın</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 mt-6">
            <div className="bg-white/20 rounded-lg p-4 backdrop-blur">
              <p className="text-purple-100 text-sm mb-1">Aktif Kampanya</p>
              <p className="text-3xl font-bold">{activeCampaigns.length}</p>
            </div>
            <div className="bg-white/20 rounded-lg p-4 backdrop-blur">
              <p className="text-purple-100 text-sm mb-1">Toplam Tasarruf</p>
              <p className="text-3xl font-bold">₺45,670</p>
            </div>
            <div className="bg-white/20 rounded-lg p-4 backdrop-blur">
              <p className="text-purple-100 text-sm mb-1">Bu Ay</p>
              <p className="text-3xl font-bold">₺12,340</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🔥 Aktif Kampanyalar</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeCampaigns.map((campaign, index) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
              >
                {campaign.banner && (
                  <img src={campaign.banner} alt={campaign.name} className="w-full h-40 object-cover" />
                )}
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{campaign.name}</h3>
                      <p className="text-sm text-gray-600">{campaign.description}</p>
                    </div>
                    {campaign.discount && (
                      <span className="px-4 py-2 bg-red-500 text-white rounded-full text-lg font-bold">
                        {campaign.discount}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{campaign.startDate} - {campaign.endDate}</span>
                    </div>
                  </div>

                  {campaign.minQty && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg mb-4">
                      <Package className="w-5 h-5 text-blue-600" />
                      <p className="text-sm text-blue-900">
                        <span className="font-bold">Min. {campaign.minQty} adet</span> alımda geçerli
                      </p>
                    </div>
                  )}

                  {campaign.minAmount && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg mb-4">
                      <Truck className="w-5 h-5 text-green-600" />
                      <p className="text-sm text-green-900">
                        <span className="font-bold">₺{campaign.minAmount.toLocaleString()}</span> ve üzeri siparişlerde
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <TrendingUp className="w-4 h-4" />
                      <span>{campaign.usageCount} kez kullanıldı</span>
                    </div>
                    <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
                      Ürünleri Gör
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {scheduledCampaigns.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">⏰ Yaklaşan Kampanyalar</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {scheduledCampaigns.map((campaign, index) => (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl overflow-hidden shadow-sm border-2 border-yellow-200"
                >
                  {campaign.banner && (
                    <div className="relative">
                      <img src={campaign.banner} alt={campaign.name} className="w-full h-40 object-cover opacity-80" />
                      <div className="absolute top-4 right-4 px-4 py-2 bg-yellow-500 text-white rounded-full text-sm font-bold flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Yakında
                      </div>
                    </div>
                  )}
                  
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{campaign.name}</h3>
                        <p className="text-sm text-gray-600">{campaign.description}</p>
                      </div>
                      {campaign.discount && (
                        <span className="px-4 py-2 bg-yellow-500 text-white rounded-full text-lg font-bold">
                          {campaign.discount}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                      <Calendar className="w-4 h-4" />
                      <span>{campaign.startDate} - {campaign.endDate}</span>
                    </div>

                    {campaign.maxUsage && (
                      <div className="px-4 py-2 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-900">
                          Sınırlı sayıda: <span className="font-bold">{campaign.maxUsage} kişi</span> için
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
