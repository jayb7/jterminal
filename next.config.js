/** @type {import('next').NextConfig} */

const nextConfig = {
  experimental: {
    appDir: true,
  },
  webpack: (config, { isServer }) => {
    // Add loader for handling .wav files
    config.module.rules.push({
      test: /\.wav$/,
      use: {
        loader: 'file-loader',
        options: {
          publicPath: '/_next/static/sounds',
          outputPath: 'static/sounds/',
          name: '[name].[hash].[ext]',
          esModule: false,
        },
      },
    });

    // Return the modified webpack configuration
    return config;
  },
};

const dotenv = require('dotenv');
dotenv.config();

module.exports = nextConfig;
