/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@servicegrid/api-client',
    '@servicegrid/permissions',
    '@servicegrid/types',
    '@servicegrid/ui',
  ],
};

export default nextConfig;
