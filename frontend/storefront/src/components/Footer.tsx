import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-ios-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <Image
                src="/logo.png"
                alt="AyazTrade Logo"
                width={32}
                height={32}
                className="rounded-ios"
              />
              <span className="ml-2 text-lg font-bold text-ios-gray-900">AyazTrade</span>
            </div>
            <p className="text-ios-gray-600">
              Kapsamlı e-ticaret çözümleri ile işinizi büyütün
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-ios-gray-900 mb-4">Ürünler</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">E-Ticaret</a></li>
              <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">CRM</a></li>
              <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">ERP</a></li>
              <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">WMS</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-ios-gray-900 mb-4">Destek</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">Yardım Merkezi</a></li>
              <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">Dokümantasyon</a></li>
              <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">İletişim</a></li>
              <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">Topluluk</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-ios-gray-900 mb-4">Şirket</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">Hakkımızda</a></li>
              <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">Kariyer</a></li>
              <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">Blog</a></li>
              <li><a href="#" className="text-ios-gray-600 hover:text-ios-blue">Basın</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-ios-gray-200 mt-8 pt-8 text-center">
          <p className="text-ios-gray-600">
            © 2024 AyazTrade. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
}
