import { ShoppingCart } from 'lucide-react';

export default function FeaturesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-ios-gray-900 mb-4">
            Neden AyazTrade?
          </h2>
          <p className="text-xl text-ios-gray-600">
            Kapsamlı e-ticaret çözümleri ile işinizi büyütün
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="text-center p-6 rounded-ios-lg shadow-ios">
            <div className="w-16 h-16 bg-ios-blue/10 rounded-ios mx-auto mb-4 flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-ios-blue" />
            </div>
            <h3 className="text-xl font-bold text-ios-gray-900 mb-2">E-Ticaret</h3>
            <p className="text-ios-gray-600">B2B ve B2C e-ticaret platformları ile satışlarınızı artırın</p>
          </div>

          <div className="text-center p-6 rounded-ios-lg shadow-ios">
            <div className="w-16 h-16 bg-ios-green/10 rounded-ios mx-auto mb-4 flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-ios-green" />
            </div>
            <h3 className="text-xl font-bold text-ios-gray-900 mb-2">CRM</h3>
            <p className="text-ios-gray-600">Müşteri ilişkileri yönetimi ile müşteri memnuniyetini artırın</p>
          </div>

          <div className="text-center p-6 rounded-ios-lg shadow-ios">
            <div className="w-16 h-16 bg-ios-purple/10 rounded-ios mx-auto mb-4 flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-ios-purple" />
            </div>
            <h3 className="text-xl font-bold text-ios-gray-900 mb-2">ERP</h3>
            <p className="text-ios-gray-600">Kurumsal kaynak planlaması ile iş süreçlerinizi optimize edin</p>
          </div>
        </div>
      </div>
    </section>
  );
}
