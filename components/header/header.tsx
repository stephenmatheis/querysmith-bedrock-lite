import Link from 'next/link';
import styles from './header.module.scss';

export function Header() {
    return (
        <header className={styles.header}>
            <Link href="/" className={styles.title}>
                QuerySmith
            </Link>
        </header>
    );
}
