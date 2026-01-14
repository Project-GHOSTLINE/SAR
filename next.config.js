/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['solutionargentrapide.ca'],
  },
  async headers() {
    return [
      {
        source: '/api/performance-diagnostic',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
        ]
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.axept.io https://client.axept.io https://www.googletagmanager.com https://widget.freshworks.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://api.resend.com https://static.axept.io https://client.axept.io https://api.axept.io https://www.google-analytics.com https://widget.freshworks.com; frame-src 'self' https://static.axept.io https://argentrapide.margill.com;"
          }
        ]
      }
    ]
  },
  async redirects() {
    return [
      // Anciennes pages WordPress -> nouvelles pages
      {
        source: '/category/:slug*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/author/:slug*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/blog',
        destination: '/',
        permanent: true,
      },
      {
        source: '/blog/:slug*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/pret-argent/:slug*',
        destination: '/demande-de-pret-en-ligne-formulaire',
        permanent: true,
      },
      {
        source: '/declaration-de-confidentialite-ca',
        destination: '/politique-de-confidentialite',
        permanent: true,
      },
      {
        source: '/confidentialite',
        destination: '/politique-de-confidentialite',
        permanent: true,
      },
      {
        source: '/politique-de-cookies-ca',
        destination: '/politique-de-cookies',
        permanent: true,
      },
      {
        source: '/problemes-de-verification-bancaire-ibv-comment-resoudre-les-erreurs-frequentes',
        destination: '/ibv',
        permanent: true,
      },
      // Ancienne URL du formulaire
      {
        source: '/demandez-votre-credit',
        destination: '/demande-de-pret-en-ligne-formulaire',
        permanent: true,
      },
      // WordPress admin et autres
      {
        source: '/wp-admin/:path*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/wp-content/:path*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/wp-includes/:path*',
        destination: '/',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
