import withPWA from 'next-pwa';

/** @type {import('next-pwa').RuntimeCaching[]} */
const runtimeCaching = [
  // ── Google Fonts ─────────────────────────────────────────────────────
  {
    urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'google-fonts',
      expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },

  // ── Static icons & local SVG logos ────────────────────────────────────
  {
    urlPattern: /\/(?:icons|logos)\/.+\.(?:svg|png|webp|ico)$/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'static-assets',
      expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },

  // ── Generated PNG icons & splash screens ─────────────────────────────
  {
    urlPattern: /^\/api\/(?:icons|splash)\//,
    handler: 'CacheFirst',
    options: {
      cacheName: 'generated-icons',
      expiration: { maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },

  // ── MLB team logo CDN ────────────────────────────────────────────────
  {
    urlPattern: /^https:\/\/www\.mlbstatic\.com\/team-logos\/.+\.svg$/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'team-logos',
      expiration: { maxEntries: 40, maxAgeSeconds: 30 * 24 * 60 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },

  // ── API: live scores (NetworkFirst — serve stale when offline) ────────
  {
    urlPattern: /^\/api\/scores/,
    handler: 'NetworkFirst',
    method: 'GET',
    options: {
      cacheName: 'api-scores',
      networkTimeoutSeconds: 10,
      expiration: { maxEntries: 14, maxAgeSeconds: 60 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },

  // ── API: standings ────────────────────────────────────────────────────
  {
    urlPattern: /^\/api\/standings/,
    handler: 'NetworkFirst',
    method: 'GET',
    options: {
      cacheName: 'api-standings',
      networkTimeoutSeconds: 10,
      expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },

  // ── API: game detail ──────────────────────────────────────────────────
  {
    urlPattern: /^\/api\/game\//,
    handler: 'NetworkFirst',
    method: 'GET',
    options: {
      cacheName: 'api-game-detail',
      networkTimeoutSeconds: 10,
      expiration: { maxEntries: 30, maxAgeSeconds: 5 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },

  // ── API: schedule & game-days ─────────────────────────────────────────
  {
    urlPattern: /^\/api\/schedule\//,
    handler: 'NetworkFirst',
    method: 'GET',
    options: {
      cacheName: 'api-schedule',
      networkTimeoutSeconds: 10,
      expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },

  // ── Next.js static chunks (JS, CSS) ──────────────────────────────────
  {
    urlPattern: /^\/_next\/static\/.+$/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'next-static',
      expiration: { maxEntries: 200, maxAgeSeconds: 365 * 24 * 60 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },

  // ── Next.js image optimization ────────────────────────────────────────
  {
    urlPattern: /^\/_next\/image.+$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'next-images',
      expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },

  // ── Everything else (pages, other same-origin) — stale-while-revalidate
  {
    urlPattern: /^https?.*/,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'offline-cache',
      networkTimeoutSeconds: 15,
      expiration: { maxEntries: 150 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
];

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    // Serve /offline when a navigation request fails (user is offline)
    document: '/offline',
  },
  runtimeCaching,
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default pwaConfig(nextConfig);
