import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zoho Bookings | Enterprise Appointment Scheduling Platform',
  description:
    'Modern, multi-tenant appointment scheduling platform for businesses, consultancies, and service providers.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
