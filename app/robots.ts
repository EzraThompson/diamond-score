import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://play-o-graph.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/offline'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
