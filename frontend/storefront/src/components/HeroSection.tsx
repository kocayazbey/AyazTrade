import Image from 'next/image';

export default function HeroSection() {
  return (
    <section className="bg-gradient-to-r from-ios-blue to-ios-purple text-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          AyazTrade ile Ticaretinizi Büyütün
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-blue-100">
          B2B ve B2C e-ticaret çözümleri ile işinizi bir üst seviyeye taşıyın
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="bg-white text-ios-blue px-8 py-3 rounded-ios font-semibold hover:bg-gray-100 transition-colors">
            Hemen Başla
          </button>
          <button className="border-2 border-white text-white px-8 py-3 rounded-ios font-semibold hover:bg-white hover:text-ios-blue transition-colors">
            Demo İzle
          </button>
        </div>
      </div>
    </section>
  );
}
