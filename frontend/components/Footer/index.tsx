// components/Footer/index.tsx
import Link from 'next/link';
import styles from './footer.module.scss';
import PhoneHours from '../Header/PhoneHours';
import { geolocationSVG } from '../../public/icons';
import Image from 'next/image';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className="iscontainer">
                <div className={styles.footerGrid}>
                    {/* Левая колонка - Навигация */}
                    <div className={styles.column}>
                        <h3 className={styles.columnTitle}>Навигация</h3>
                        <nav className={styles.navigation}>
                            <div className={styles.navGroup}>
                                <Link href="/" className={styles.navLink}>
                                    Главная
                                </Link>
                                <Link href="/promotions" className={styles.navLink}>
                                    Акции
                                </Link>
                                <Link href="/about" className={styles.navLink}>
                                    О нас
                                </Link>
                                <Link href="/blog" className={styles.navLink}>
                                    Блог
                                </Link>
                            </div>
                            <div className={styles.navGroup}>
                                <h2 className={styles.titleMenu}>Меню</h2>
                                <div className={styles.navMenu}>
                                    <Link href="/menu" className={styles.navLink}>
                                        Все
                                    </Link>
                                    <Link href="/menu/drinks" className={styles.navLink}>
                                        Напитки
                                    </Link>
                                    <Link href="/menu/desserts" className={styles.navLink}>
                                        Десерты
                                    </Link>
                                    <Link href="/menu/sandwiches" className={styles.navLink}>
                                        Сэндвичи и выпечка
                                    </Link>
                                </div>
                            </div>
                        </nav>
                    </div>

                    {/* Правая колонка - Контакты */}
                    <div className={styles.column}>
                        <h3 className={styles.columnTitle}>Контакты</h3>
                        <PhoneHours />

                        <div className={styles.geolocation}>
                            <Image
                                src={geolocationSVG}
                                alt="иконка геолокации"
                                width={20}
                                height={20}
                                className={styles.geoIcon}
                            />
                            <div className={styles.geolocationText}>
                                <p className={styles.city}>Москва</p>
                                <p className={styles.address}>ул. Вешняковская, 18А</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Копирайт */}
                <div className={styles.copyright}>
                    <p>© 2026 Magicup Coffee</p>
                </div>
            </div>
        </footer>
    );
}