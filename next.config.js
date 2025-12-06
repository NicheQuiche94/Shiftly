/** @type {import('next').NextConfig} */
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

module.exports = nextConfig