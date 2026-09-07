import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rooman Bookings | Rooman Technologies Appointment & Skilling Portal',
  description:
    'Official consultation and skilling scheduling platform for Rooman Technologies. Book 1-on-1 IT career counseling, enterprise workforce upskilling, and University Center of Excellence sessions.',
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
