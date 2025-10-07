/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Skip ESLint checks during production builds so lint errors don't fail Vercel deploys.
  // Local development still runs ESLint via your editor or `next lint`.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
