import type { Metadata } from 'next';
import './globals.css';
import { SSOProvider } from '../components/SSOProvider';

export const metadata: Metadata = {
  title: 'Kleegr Notes',
  description: 'A beautiful notes app built with Next.js',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SSOProvider>
          {children}
        </SSOProvider>
      </body>
    </html>
  );
}
