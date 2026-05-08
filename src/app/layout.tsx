import '@/styles/globals.css';
import type { Metadata, Viewport } from 'next';
import SessionProvider from '@/components/SessionProvider';
import PageLoader from '@/components/PageLoader';

export const metadata: Metadata = {
  title: {
    default: 'Dart Command Center',
    template: '%s · Dart Command Center',
  },
  description: 'Internal team performance & activity platform for Dart Marketing',
  applicationName: 'Dart Command Center',
  authors: [{ name: 'Dart Marketing' }],
  keywords: ['dart marketing', 'team management', 'performance', 'analytics'],
  icons: {
    icon: '/logo-new.png',
    apple: '/logo-new.png',
    shortcut: '/logo-new.png',
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#ED671C',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased">
      <body className="font-sans">
        <SessionProvider>
          <PageLoader />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}