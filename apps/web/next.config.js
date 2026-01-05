/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    dirs: ['src'],
  },
  transpilePackages: ['@job-tracker/shared'],
};

module.exports = nextConfig;
