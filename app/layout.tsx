import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kleegr Notes',
  description: 'A beautiful notes app built with Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
