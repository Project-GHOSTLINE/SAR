/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['solutionargentrapide.ca'],
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
