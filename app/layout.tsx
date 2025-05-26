import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import { Header } from '@/components/header';
import '@/styles/app.scss';

const mono = Nunito({
    subsets: ['latin'],
    variable: '--font-nunito',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'QuerySmith',
    description: 'QuerySmith',
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={mono.variable} suppressHydrationWarning>
                <div className="page">
                    <Header />
                    {children}
                </div>
            </body>
        </html>
    );
}
