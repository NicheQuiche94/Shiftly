/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Empty turbopack config to silence the warning
  turbopack: {},
  // Only use webpack config when NOT using turbopack
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