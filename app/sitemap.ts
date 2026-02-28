import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://diamondscore.app';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/standings`,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/schedule`,
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ];
}
