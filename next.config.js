/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },

  async headers() {
    return [
      {
        // Board artwork is static, so let the browser keep it for a year and
        // stop revalidating on every load. This matters most on a Raspberry Pi
        // kiosk, where dozens of conditional requests on each boot are a
        // visible stall.
        //
        // Safe to cache this hard because `scripts/optimize-images.js` puts a
        // content hash in each generated filename — edited artwork gets a new
        // name, so there is never a stale file to clear.
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
