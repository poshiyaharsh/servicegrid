import React from 'react';
import '@servicegrid/ui/styles/tokens.css';
import '@servicegrid/ui/styles/animations.css';

export const metadata = {
  title: {
    default: 'FieldSutra — Field Service Operations Management',
    template: '%s | FieldSutra',
  },
  description:
    'Manage customers, service requests, dispatch, offline-first technicians, inventory, AMC contracts, and GST/global billing.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8FAFC] text-[#0F172A] antialiased">{children}</body>
    </html>
  );
}
