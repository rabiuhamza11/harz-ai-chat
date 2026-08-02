/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/open-source',
        destination: `${process.env.OPEN_SOURCE_API_URL || 'http://localhost:8000'}/chat`,
      },
    ];
  },
};

module.exports = nextConfig;
