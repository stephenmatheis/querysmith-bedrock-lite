import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import { Header } from '@/components/header';
import '@/styles/app.scss';

const mono = Nunito({
    subsets: ['latin'],
    variable: '--font-mono',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Quirk',
    description: 'Plus Ultra!',
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
                <Header />
                {children}
            </body>
        </html>
    );
}
