import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
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

export const metadata: Metadata = {
  title: 'DiamondScore',
  description: 'Live baseball scores from MLB, NPB, and KBO',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DiamondScore',
  },
};

export const viewport: Viewport = {
  themeColor: '#F2FAF2',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jakarta.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased bg-surface text-gray-900">
        <SettingsProvider>
          <FavoritesProvider>
            <ThemeApplier />
            <Onboarding />
            <div className="min-h-screen flex flex-col max-w-lg mx-auto">
              <main className="flex-1 flex flex-col pb-16 overflow-hidden">
                {children}
              </main>
              <BottomNav />
            </div>
          </FavoritesProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
