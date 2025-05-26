import Link from 'next/link';

export default function NotFound() {
    return (
        <div
            style={{
                height: '100dvh',
                width: '100vw',
                display: 'grid',
                placeItems: 'center',
            }}
        >
            <div style={{ display: 'grid', placeItems: 'center', gap: 36 }}>
                <h1 style={{ textAlign: 'center', margin: 0 }}>404 - Page not found</h1>
                <Link href="/">Go back to Home</Link>
            </div>
        </div>
    );
}
