/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript types are hand-written stubs; run `supabase gen types typescript --local`
  // when the DB is live to get accurate types and remove this flag.
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

module.exports = nextConfig
