import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ToastProvider } from '@/components/Toast';
import ThemeApplier from '@/components/ThemeApplier';
import Onboarding from '@/components/Onboarding';


const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['400', '600'],
  display: 'swap',
});

// iOS splash screen sizes for common iPhone models (portrait, physical pixels)
// Format: [deviceWidth, deviceHeight, pixelRatio]
const SPLASH_SIZES: [number, number, number][] = [
  [390, 844, 3],   // iPhone 12 / 13 / 14
  [393, 852, 3],   // iPhone 14 Pro / 15 / 15 Pro
  [430, 932, 3],   // iPhone 14 Plus / 15 Plus
  [430, 932, 3],   // iPhone 15 Pro Max  (same logical size)
  [375, 812, 3],   // iPhone X / XS / 11 Pro
  [375, 667, 2],   // iPhone SE (2nd/3rd gen) / iPhone 8
  [414, 896, 2],   // iPhone XR / 11
  [414, 896, 3],   // iPhone XS Max / 11 Pro Max
];

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://play-o-graph.com';

export const metadata: Metadata = {
  title: {
    default: 'Play-O-Graph — Live Baseball Scores | MLB, KBO, NPB & More',
    template: '%s | Play-O-Graph',
  },
  description: 'Live baseball scores and standings from MLB, KBO, NPB, MiLB, NCAA, and international leagues. Real-time box scores, schedules, and results updated every 15 seconds.',
  keywords: ['baseball scores', 'KBO scores', 'NPB scores', 'MLB scores', 'japan baseball scores', 'korea baseball scores', 'live baseball', 'international baseball', 'minor league baseball scores', 'college baseball scores'],
  manifest: '/manifest.json',
  alternates: { canonical: SITE_URL },
  // Apple-specific PWA tags
  appleWebApp: {
    capable: true,
    title: 'Play-O-Graph',
    statusBarStyle: 'black-translucent',
    startupImage: SPLASH_SIZES.map(([w, h, dpr]) => ({
      url: `/api/splash/${w * dpr}/${h * dpr}`,
      media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
    })),
  },
  // App icons
  icons: {
    // Standard favicon
    icon: [
      { url: '/icons/icon-192.svg', type: 'image/svg+xml' },
      { url: '/api/icons/192', sizes: '192x192', type: 'image/png' },
    ],
    // iOS home screen icon (must be PNG)
    apple: [
      { url: '/api/icons/180', sizes: '180x180', type: 'image/png' },
    ],
  },
  // Open Graph
  openGraph: {
    title: 'Play-O-Graph — Live Baseball Scores',
    description: 'Live scores from MLB, KBO, NPB, MiLB, NCAA, and international baseball leagues.',
    url: SITE_URL,
    siteName: 'Play-O-Graph',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Play-O-Graph — Live Baseball Scores',
    description: 'Live scores from MLB, KBO, NPB, MiLB, NCAA, and international baseball leagues.',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F2FAF2' },
    { media: '(prefers-color-scheme: dark)', color: '#0C2A0C' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Ensures content extends under the iOS status bar notch when installed
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jakarta.variable} ${jetbrains.variable}`}>
      <head>
        <meta name="format-detection" content="telephone=no" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <link rel="preconnect" href="https://midfield.mlbstatic.com" />
        <link rel="dns-prefetch" href="https://midfield.mlbstatic.com" />
      </head>
      <body className="font-sans antialiased bg-surface text-gray-900">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Play-O-Graph',
              url: SITE_URL,
              description: 'Live baseball scores from MLB, KBO, NPB, MiLB, NCAA, and international leagues',
            }),
          }}
        />
        <SettingsProvider>
          <FavoritesProvider>
            <ToastProvider>
              <ThemeApplier />
              <Onboarding />
              <div className="h-screen flex flex-col max-w-lg md:max-w-3xl mx-auto overflow-hidden">
                <main className="flex-1 flex flex-col pb-16 overflow-hidden">
                  {children}
                </main>
                <BottomNav />
              </div>
            </ToastProvider>
          </FavoritesProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
