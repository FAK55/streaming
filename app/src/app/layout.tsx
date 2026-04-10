import type { Metadata } from 'next';
import './globals.css';
import NavBar from '@/components/NavBar';
import { ServerHostProvider } from '@/lib/ServerHostContext';

export const metadata: Metadata = {
  title: 'StreamLab — Real-Time Streaming Workshop',
  description: 'Interactive demo environment for the GameJam 2026 streaming workshop',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <ServerHostProvider>
          <NavBar />
          <main className="pt-12">{children}</main>
        </ServerHostProvider>
      </body>
    </html>
  );
}
