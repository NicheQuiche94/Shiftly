/** @type {import('next').NextConfig} */
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!config.ignoreWarnings) {
      config.ignoreWarnings = [];
    }
    // Ignore Python files
    config.module.rules.push({
      test: /\.py$/,
      type: 'asset/resource',
      generator: {
        emit: false,
      },
    });
    return config;
  },
}

module.exports = withPWA(nextConfig)