/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com'],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, './src'),
    }
    // Exclude test files from build
    config.module.rules.push({
      test: /\.(test|spec)\.(ts|tsx)$/,
      use: 'ignore-loader',
    })
    return config
  },
}

module.exports = nextConfig

