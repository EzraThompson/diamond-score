import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://play-o-graph.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/mlb`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/npb`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/kbo`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/milb`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/ncaa`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/standings`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/schedule`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ];
}
