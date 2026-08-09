import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SmartTBB Construction Control',
  description: 'ระบบบันทึกและติดตามงานก่อสร้าง',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
